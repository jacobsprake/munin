"""
Model card generation for every deployed model.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

try:
    import yaml  # type: ignore
    _HAS_YAML = True
except ImportError:
    _HAS_YAML = False


# ------------------------------------------------------------------
# Data structures
# ------------------------------------------------------------------

@dataclass
class TrainingInfo:
    data_sources: List[str] = field(default_factory=list)
    n_scenarios: int = 0
    date: str = ""
    framework: str = "pytorch"
    participants: int = 0
    privacy_budget: float = 0.0


@dataclass
class PerformanceInfo:
    precision: float = 0.0
    recall: float = 0.0
    auc: float = 0.0
    fpr: float = 0.0
    mean_detection_time: float = 0.0
    multi_hop_accuracy: float = 0.0
    cross_sector_accuracy: float = 0.0


@dataclass
class AdversarialTestingInfo:
    noise_robustness: float = 0.0
    missing_sensor_tolerance: float = 0.0
    adversarial_injection_detection: float = 0.0
    topology_transfer: float = 0.0


@dataclass
class GovernanceInfo:
    approved_by: str = ""
    last_revalidation: str = ""
    next_review: str = ""
    drift_alert_threshold: float = 0.15


@dataclass
class ModelCard:
    """Complete model card for a Munin-deployed model."""

    name: str = ""
    version: str = ""
    domain: str = ""
    training: TrainingInfo = field(default_factory=TrainingInfo)
    performance: PerformanceInfo = field(default_factory=PerformanceInfo)
    adversarial_testing: AdversarialTestingInfo = field(
        default_factory=AdversarialTestingInfo
    )
    limitations: List[str] = field(default_factory=list)
    governance: GovernanceInfo = field(default_factory=GovernanceInfo)

    # ------------------------------------------------------------------
    # Serialisation
    # ------------------------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        """JSON-serialisable dictionary."""
        return asdict(self)

    def to_yaml(self) -> str:
        """YAML string (for docs)."""
        if not _HAS_YAML:
            # Fallback: emit JSON-style output
            return json.dumps(self.to_dict(), indent=2, default=str)
        return yaml.dump(self.to_dict(), default_flow_style=False, sort_keys=False)

    def to_markdown(self) -> str:
        """Formatted markdown model card."""
        lines: List[str] = []
        lines.append(f"# Model Card: {self.name} v{self.version}")
        lines.append("")
        lines.append(f"**Domain:** {self.domain}")
        lines.append("")

        lines.append("## Training")
        t = self.training
        lines.append(f"- Data sources: {', '.join(t.data_sources) if t.data_sources else 'N/A'}")
        lines.append(f"- Scenarios: {t.n_scenarios}")
        lines.append(f"- Date: {t.date}")
        lines.append(f"- Framework: {t.framework}")
        lines.append(f"- Federated participants: {t.participants}")
        lines.append(f"- Privacy budget (epsilon): {t.privacy_budget:.2f}")
        lines.append("")

        lines.append("## Performance")
        p = self.performance
        lines.append(f"| Metric | Value |")
        lines.append(f"|--------|-------|")
        lines.append(f"| Precision | {p.precision:.4f} |")
        lines.append(f"| Recall | {p.recall:.4f} |")
        lines.append(f"| AUC | {p.auc:.4f} |")
        lines.append(f"| FPR | {p.fpr:.4f} |")
        lines.append(f"| Mean detection time | {p.mean_detection_time:.2f}s |")
        lines.append(f"| Multi-hop accuracy | {p.multi_hop_accuracy:.4f} |")
        lines.append(f"| Cross-sector accuracy | {p.cross_sector_accuracy:.4f} |")
        lines.append("")

        lines.append("## Adversarial Testing")
        a = self.adversarial_testing
        lines.append(f"- Noise robustness: {a.noise_robustness:.4f}")
        lines.append(f"- Missing sensor tolerance: {a.missing_sensor_tolerance:.4f}")
        lines.append(f"- Adversarial injection detection: {a.adversarial_injection_detection:.4f}")
        lines.append(f"- Topology transfer: {a.topology_transfer:.4f}")
        lines.append("")

        lines.append("## Limitations")
        for lim in self.limitations:
            lines.append(f"- {lim}")
        lines.append("")

        lines.append("## Governance")
        g = self.governance
        lines.append(f"- Approved by: {g.approved_by}")
        lines.append(f"- Last revalidation: {g.last_revalidation}")
        lines.append(f"- Next review: {g.next_review}")
        lines.append(f"- Drift alert threshold: {g.drift_alert_threshold}")

        return "\n".join(lines)

    def save(self, path: str | Path) -> None:
        """Save model card to a JSON file."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.to_dict(), indent=2, default=str))
        logger.info("Model card saved to %s", path)

    @classmethod
    def load(cls, path: str | Path) -> "ModelCard":
        """Load model card from a JSON file."""
        data = json.loads(Path(path).read_text())
        return cls(
            name=data.get("name", ""),
            version=data.get("version", ""),
            domain=data.get("domain", ""),
            training=TrainingInfo(**data.get("training", {})),
            performance=PerformanceInfo(**data.get("performance", {})),
            adversarial_testing=AdversarialTestingInfo(
                **data.get("adversarial_testing", {})
            ),
            limitations=data.get("limitations", []),
            governance=GovernanceInfo(**data.get("governance", {})),
        )

    def validate(self) -> List[str]:
        """
        Check all required fields are present.
        Returns a list of validation errors (empty if valid).
        """
        errors: List[str] = []
        if not self.name:
            errors.append("name is required")
        if not self.version:
            errors.append("version is required")
        if not self.domain:
            errors.append("domain is required")
        if not self.training.data_sources:
            errors.append("training.data_sources is required")
        if not self.governance.approved_by:
            errors.append("governance.approved_by is required")
        return errors


class ModelCardGenerator:
    """Auto-generate model cards from training metadata."""

    def generate(
        self,
        model: Any,
        training_history: Dict[str, Any],
        eval_results: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None,
    ) -> ModelCard:
        """
        Generate a ModelCard from training artefacts.

        Args:
            model: The trained model (used for name/version extraction).
            training_history: Dict with keys like 'data_sources', 'n_scenarios',
                'date', 'framework', 'participants', 'privacy_budget'.
            eval_results: Dict with keys matching PerformanceInfo and
                AdversarialTestingInfo fields.
            config: Optional extra configuration.
        """
        config = config or {}
        now = datetime.utcnow().isoformat()

        model_name = config.get("name", getattr(model, "__class__", type(model)).__name__)
        model_version = config.get("version", "0.1.0")

        training = TrainingInfo(
            data_sources=training_history.get("data_sources", []),
            n_scenarios=training_history.get("n_scenarios", 0),
            date=training_history.get("date", now),
            framework=training_history.get("framework", "pytorch"),
            participants=training_history.get("participants", 1),
            privacy_budget=training_history.get("privacy_budget", 0.0),
        )

        performance = PerformanceInfo(
            precision=eval_results.get("precision", 0.0),
            recall=eval_results.get("recall", 0.0),
            auc=eval_results.get("auc", 0.0),
            fpr=eval_results.get("fpr", 0.0),
            mean_detection_time=eval_results.get("mean_detection_time", 0.0),
            multi_hop_accuracy=eval_results.get("multi_hop_accuracy", 0.0),
            cross_sector_accuracy=eval_results.get("cross_sector_accuracy", 0.0),
        )

        adversarial = AdversarialTestingInfo(
            noise_robustness=eval_results.get("noise_robustness", 0.0),
            missing_sensor_tolerance=eval_results.get("missing_sensor_tolerance", 0.0),
            adversarial_injection_detection=eval_results.get(
                "adversarial_injection_detection", 0.0
            ),
            topology_transfer=eval_results.get("topology_transfer", 0.0),
        )

        governance = GovernanceInfo(
            approved_by=config.get("approved_by", ""),
            last_revalidation=now,
            next_review=config.get("next_review", ""),
            drift_alert_threshold=config.get("drift_alert_threshold", 0.15),
        )

        return ModelCard(
            name=model_name,
            version=model_version,
            domain=config.get("domain", ""),
            training=training,
            performance=performance,
            adversarial_testing=adversarial,
            limitations=config.get("limitations", []),
            governance=governance,
        )
