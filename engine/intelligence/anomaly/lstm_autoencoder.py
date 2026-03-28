"""
LSTM-Autoencoder for learning normal SCADA/infrastructure sensor behavior.

Architecture:
    Bidirectional LSTM Encoder -> Latent space z -> LSTM Decoder

The encoder compresses multivariate time-series windows into a fixed-size
latent representation. The decoder reconstructs expected sensor readings
from the latent space. Anomalies manifest as high reconstruction error.
"""

from __future__ import annotations

import torch
import torch.nn as nn
from typing import Tuple


class LSTMAutoencoder(nn.Module):
    """Bidirectional LSTM autoencoder for multivariate time-series.

    Parameters
    ----------
    n_sensors : int
        Number of input sensor channels.
    hidden_dim : int
        Hidden dimension of LSTM cells.
    latent_dim : int
        Dimension of the compressed latent representation (32-64 typical).
    n_layers : int
        Number of stacked LSTM layers.
    dropout : float
        Dropout probability between LSTM layers (applied when n_layers > 1).
    """

    def __init__(
        self,
        n_sensors: int,
        hidden_dim: int = 128,
        latent_dim: int = 32,
        n_layers: int = 2,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        self.n_sensors = n_sensors
        self.hidden_dim = hidden_dim
        self.latent_dim = latent_dim
        self.n_layers = n_layers

        # --- Encoder ---
        # Bidirectional LSTM produces 2*hidden_dim output at each timestep.
        self.encoder_lstm = nn.LSTM(
            input_size=n_sensors,
            hidden_size=hidden_dim,
            num_layers=n_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if n_layers > 1 else 0.0,
        )

        # Project concatenated final hidden states (fwd + bwd, all layers)
        # into the latent space. We use the last-layer hidden states from
        # both directions: 2 * hidden_dim -> latent_dim.
        self.encoder_proj = nn.Sequential(
            nn.Linear(2 * hidden_dim, latent_dim),
            nn.ReLU(inplace=True),
        )

        # --- Decoder ---
        # Unidirectional LSTM reconstructs the sequence from the latent code.
        self.decoder_lstm = nn.LSTM(
            input_size=latent_dim,
            hidden_size=hidden_dim,
            num_layers=n_layers,
            batch_first=True,
            dropout=dropout if n_layers > 1 else 0.0,
        )

        # Map LSTM output back to sensor space.
        self.decoder_output = nn.Linear(hidden_dim, n_sensors)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def encode(self, x: torch.Tensor) -> torch.Tensor:
        """Encode a batch of sensor windows into latent vectors.

        Parameters
        ----------
        x : Tensor of shape (batch, seq_len, n_sensors)

        Returns
        -------
        z : Tensor of shape (batch, latent_dim)
        """
        # encoder_lstm output: (batch, seq_len, 2*hidden_dim)
        # h_n shape: (2*n_layers, batch, hidden_dim) for bidirectional
        _, (h_n, _) = self.encoder_lstm(x)

        # Take final hidden states from the last layer for both directions.
        # h_n is arranged as [layer0_fwd, layer0_bwd, layer1_fwd, layer1_bwd, ...]
        # Last forward: index -2, last backward: index -1
        h_fwd = h_n[-2]  # (batch, hidden_dim)
        h_bwd = h_n[-1]  # (batch, hidden_dim)
        h_cat = torch.cat([h_fwd, h_bwd], dim=-1)  # (batch, 2*hidden_dim)

        z = self.encoder_proj(h_cat)  # (batch, latent_dim)
        return z

    def decode(self, z: torch.Tensor, seq_len: int) -> torch.Tensor:
        """Decode latent vectors back to sensor time-series.

        Parameters
        ----------
        z : Tensor of shape (batch, latent_dim)
        seq_len : int
            Length of the output sequence to reconstruct.

        Returns
        -------
        x_hat : Tensor of shape (batch, seq_len, n_sensors)
        """
        # Repeat the latent code at every timestep as decoder input.
        z_repeated = z.unsqueeze(1).repeat(1, seq_len, 1)  # (batch, seq_len, latent_dim)

        # Decode
        decoder_out, _ = self.decoder_lstm(z_repeated)  # (batch, seq_len, hidden_dim)
        x_hat = self.decoder_output(decoder_out)  # (batch, seq_len, n_sensors)
        return x_hat

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Full forward pass: encode then decode.

        Parameters
        ----------
        x : Tensor of shape (batch, seq_len, n_sensors)

        Returns
        -------
        x_hat : Tensor of shape (batch, seq_len, n_sensors)
            Reconstructed sensor readings.
        z : Tensor of shape (batch, latent_dim)
            Latent representation (useful for downstream anomaly detection).
        """
        seq_len = x.size(1)
        z = self.encode(x)
        x_hat = self.decode(z, seq_len)
        return x_hat, z
