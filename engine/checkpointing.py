"""
Checkpoint system for engine pipeline stages.

Enables idempotent retries and resume-from-failure capabilities.
"""
import json
import pickle
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass, asdict
from engine.errors import CheckpointError, ErrorCode


@dataclass
class CheckpointMetadata:
    """Metadata for a checkpoint."""
    stage: str
    timestamp: str
    run_id: str
    config_version: str
    data_hash: Optional[str] = None
    status: str = "in_progress"  # in_progress, completed, failed


class CheckpointManager:
    """Manages checkpoints for engine pipeline stages."""
    
    def __init__(self, checkpoint_dir: Path):
        self.checkpoint_dir = checkpoint_dir
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
    
    def save_checkpoint(
        self,
        stage: str,
        data: Any,
        run_id: str,
        config_version: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Path:
        """Save checkpoint for a stage."""
        checkpoint_path = self.checkpoint_dir / f"{stage}.chk"
        metadata_path = self.checkpoint_dir / f"{stage}.meta.json"
        
        # Save data (pickle for Python objects, JSON for dicts)
        if isinstance(data, dict):
            with open(checkpoint_path, 'w') as f:
                json.dump(data, f, indent=2)
        else:
            with open(checkpoint_path, 'wb') as f:
                pickle.dump(data, f)
        
        # Save metadata
        checkpoint_meta = CheckpointMetadata(
            stage=stage,
            timestamp=datetime.now().isoformat(),
            run_id=run_id,
            config_version=config_version,
            status="completed"
        )
        
        if metadata:
            checkpoint_meta.data_hash = metadata.get('data_hash')
        
        with open(metadata_path, 'w') as f:
            json.dump(asdict(checkpoint_meta), f, indent=2)
        
        return checkpoint_path
    
    def load_checkpoint(
        self,
        stage: str,
        is_json: bool = True
    ) -> Optional[Any]:
        """Load checkpoint for a stage."""
        checkpoint_path = self.checkpoint_dir / f"{stage}.chk"
        
        if not checkpoint_path.exists():
            return None
        
        try:
            if is_json:
                with open(checkpoint_path, 'r') as f:
                    return json.load(f)
            else:
                with open(checkpoint_path, 'rb') as f:
                    return pickle.load(f)
        except Exception as e:
            raise CheckpointError(
                ErrorCode.CHECKPOINT_CORRUPT,
                f"Failed to load checkpoint for stage {stage}",
                {'error': str(e), 'path': str(checkpoint_path)}
            )
    
    def checkpoint_exists(self, stage: str) -> bool:
        """Check if checkpoint exists for a stage."""
        checkpoint_path = self.checkpoint_dir / f"{stage}.chk"
        return checkpoint_path.exists()
    
    def get_checkpoint_metadata(self, stage: str) -> Optional[CheckpointMetadata]:
        """Get metadata for a checkpoint."""
        metadata_path = self.checkpoint_dir / f"{stage}.meta.json"
        
        if not metadata_path.exists():
            return None
        
        try:
            with open(metadata_path, 'r') as f:
                data = json.load(f)
                return CheckpointMetadata(**data)
        except Exception:
            return None
    
    def clear_checkpoint(self, stage: str):
        """Clear checkpoint for a stage."""
        checkpoint_path = self.checkpoint_dir / f"{stage}.chk"
        metadata_path = self.checkpoint_dir / f"{stage}.meta.json"
        
        if checkpoint_path.exists():
            checkpoint_path.unlink()
        if metadata_path.exists():
            metadata_path.unlink()
    
    def list_checkpoints(self) -> list[str]:
        """List all available checkpoints."""
        checkpoints = []
        for path in self.checkpoint_dir.glob("*.chk"):
            stage = path.stem
            checkpoints.append(stage)
        return checkpoints
