"""
Edge-Conditioned Graph Neural Network encoder.

Implements message passing with edge-conditioned transformations for
infrastructure graph encoding. No dependency on PyTorch Geometric --
uses plain PyTorch with manual scatter_add.

Edge features encode:
  - lag (seconds between connected nodes)
  - confidence (edge reliability score)
  - physical_type (one-hot: hydraulic=0, electrical=1, thermal=2, communications=3)
  - distance (physical distance between nodes)

Total default edge_dim = 8 (1 lag + 1 confidence + 4 one-hot + 1 distance + 1 spare).
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


# ---------------------------------------------------------------------------
# Physical type encoding helpers
# ---------------------------------------------------------------------------

PHYSICAL_TYPES = {
    "hydraulic": 0,
    "electrical": 1,
    "thermal": 2,
    "communications": 3,
}
NUM_PHYSICAL_TYPES = len(PHYSICAL_TYPES)


def encode_physical_type(type_name: str) -> torch.Tensor:
    """Return a one-hot tensor of length NUM_PHYSICAL_TYPES."""
    idx = PHYSICAL_TYPES.get(type_name, 0)
    vec = torch.zeros(NUM_PHYSICAL_TYPES)
    vec[idx] = 1.0
    return vec


# ---------------------------------------------------------------------------
# Manual scatter_add
# ---------------------------------------------------------------------------

def scatter_add(
    src: torch.Tensor,
    index: torch.LongTensor,
    dim: int,
    dim_size: int,
) -> torch.Tensor:
    """
    Sum *src* elements into positions given by *index* along *dim*.

    Equivalent to torch_scatter.scatter_add but implemented with plain
    PyTorch so we have zero external dependencies.

    Args:
        src: source tensor of shape (E, D) (or any shape).
        index: 1-D index tensor of length src.size(dim).
        dim: dimension along which to scatter.
        dim_size: size of the output along *dim*.

    Returns:
        Tensor with the same shape as *src* except dim has size *dim_size*.
    """
    shape = list(src.shape)
    shape[dim] = dim_size
    out = torch.zeros(shape, dtype=src.dtype, device=src.device)

    # Expand index to match src shape for scatter_add_
    idx = index.unsqueeze(-1).expand_as(src) if src.dim() == 2 and dim == 0 else index
    if src.dim() == 2 and dim == 0:
        out.scatter_add_(dim, idx, src)
    else:
        # General fallback
        idx_expanded = index
        for _ in range(src.dim() - 1):
            idx_expanded = idx_expanded.unsqueeze(-1)
        idx_expanded = idx_expanded.expand_as(src)
        out.scatter_add_(dim, idx_expanded, src)

    return out


# ---------------------------------------------------------------------------
# EdgeMLP -- transforms (source_features || edge_features) -> message
# ---------------------------------------------------------------------------

class EdgeMLP(nn.Module):
    """
    Edge-conditioned message function.

    Takes the concatenation of source node features and edge features,
    and produces a message vector of size *out_dim*.
    """

    def __init__(self, node_dim: int, edge_dim: int, out_dim: int) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(node_dim + edge_dim, out_dim),
            nn.LayerNorm(out_dim),
            nn.SiLU(),
            nn.Linear(out_dim, out_dim),
            nn.SiLU(),
        )

    def forward(
        self,
        source_features: torch.Tensor,
        edge_features: torch.Tensor,
    ) -> torch.Tensor:
        """
        Args:
            source_features: (E, node_dim)  -- features of source nodes per edge.
            edge_features:   (E, edge_dim)  -- per-edge attribute vectors.

        Returns:
            messages: (E, out_dim)
        """
        return self.net(torch.cat([source_features, edge_features], dim=-1))


# ---------------------------------------------------------------------------
# Single GNN layer
# ---------------------------------------------------------------------------

class _ECGNNLayer(nn.Module):
    """One layer of edge-conditioned message passing + node update."""

    def __init__(
        self,
        in_dim: int,
        edge_dim: int,
        out_dim: int,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        self.edge_mlp = EdgeMLP(in_dim, edge_dim, out_dim)
        self.node_update = nn.Linear(out_dim + in_dim, out_dim)
        self.norm = nn.LayerNorm(out_dim)
        self.dropout = nn.Dropout(dropout)
        self.act = nn.SiLU()

    def forward(
        self,
        node_features: torch.Tensor,
        edge_index: torch.LongTensor,
        edge_features: torch.Tensor,
    ) -> torch.Tensor:
        """
        Args:
            node_features: (N, in_dim)
            edge_index:    (2, E) -- [source_nodes; target_nodes]
            edge_features: (E, edge_dim)

        Returns:
            updated: (N, out_dim)
        """
        src_idx, tgt_idx = edge_index[0], edge_index[1]
        num_nodes = node_features.size(0)

        # Gather source node features for each edge
        src_feats = node_features[src_idx]  # (E, in_dim)

        # Compute edge-conditioned messages
        messages = self.edge_mlp(src_feats, edge_features)  # (E, out_dim)

        # Aggregate messages to target nodes via scatter_add
        agg = scatter_add(messages, tgt_idx, dim=0, dim_size=num_nodes)  # (N, out_dim)

        # Node update: combine aggregated messages with current features
        combined = torch.cat([agg, node_features], dim=-1)  # (N, out_dim + in_dim)
        updated = self.act(self.node_update(combined))
        updated = self.norm(updated)
        updated = self.dropout(updated)

        return updated


# ---------------------------------------------------------------------------
# Full Edge-Conditioned GNN
# ---------------------------------------------------------------------------

class EdgeConditionedGNN(nn.Module):
    """
    Multi-layer edge-conditioned GNN for infrastructure graph encoding.

    For each node v at each layer:
        h_v = sigma(W * AGG({MLP_edge(h_u, e_uv) for u in N(v)}) + b)

    Uses residual connections between layers when dimensions match.
    """

    def __init__(
        self,
        node_dim: int,
        edge_dim: int,
        hidden_dim: int,
        n_layers: int = 3,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        self.node_dim = node_dim
        self.edge_dim = edge_dim
        self.hidden_dim = hidden_dim
        self.n_layers = n_layers

        # Input projection
        self.input_proj = nn.Linear(node_dim, hidden_dim)

        # Message-passing layers
        self.layers = nn.ModuleList()
        for _ in range(n_layers):
            self.layers.append(
                _ECGNNLayer(hidden_dim, edge_dim, hidden_dim, dropout=dropout)
            )

        # Output projection (back to node_dim so it can feed downstream)
        self.output_proj = nn.Linear(hidden_dim, hidden_dim)
        self.norm = nn.LayerNorm(hidden_dim)

    def forward(
        self,
        node_features: torch.Tensor,
        edge_index: torch.LongTensor,
        edge_features: torch.Tensor,
    ) -> torch.Tensor:
        """
        Encode infrastructure graph into node embeddings.

        Args:
            node_features: (N, node_dim)  -- sensor readings, health, anomaly flags.
            edge_index:    (2, E)         -- sparse adjacency (source, target).
            edge_features: (E, edge_dim)  -- lag, confidence, physical_type one-hot, distance.

        Returns:
            embeddings: (N, hidden_dim)
        """
        h = self.input_proj(node_features)  # (N, hidden_dim)

        for layer in self.layers:
            h_new = layer(h, edge_index, edge_features)
            # Residual connection
            h = h + h_new

        h = self.norm(self.output_proj(h))
        return h
