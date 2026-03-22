# ADR-007: Python Inference Engine + TypeScript/Next.js Platform Layer

**Date:** 2026-02-05

## Status

Accepted

## Context

Munin's architecture has two distinct computational domains with fundamentally different requirements.

The first domain is the inference engine: time-series correlation analysis, lag detection, statistical significance testing, dependency graph construction, cascade simulation, and anomaly detection. This is scientific computing — matrix operations, signal processing, probabilistic modeling, and numerical optimization. The algorithms operate on dense numerical data, require extensive linear algebra support, and benefit from mature statistical libraries.

The second domain is the platform layer: ministry authentication and quorum management, packet signing and verification, real-time dashboard rendering, API serving, role-based access control, audit log management, and deployment configuration. This is systems and web engineering — type-safe API contracts, real-time WebSocket communication, server-side rendering for secure environments, and component-based UI development.

No single language ecosystem excels at both domains. Choosing a single language forces one domain to use inferior tooling, which translates directly into slower development velocity, more bugs, and worse performance.

## Decision

The architecture splits at the data boundary between the inference engine and the platform layer.

**Python handles the inference engine:**
- Sensor telemetry ingestion and normalization
- Time-series cross-correlation computation (numpy, scipy)
- Statistical significance testing for candidate shadow links
- Dependency graph construction and analysis (networkx)
- Cascade failure simulation
- Anomaly detection and alerting logic
- ML model training and evaluation (scikit-learn, PyTorch where needed)
- Data pipeline orchestration

**TypeScript/Next.js handles the platform layer:**
- Ministry authentication and session management
- M-of-N quorum orchestration (see ADR-001)
- Dual-stack packet signing and verification (see ADR-005)
- REST and WebSocket API serving
- Real-time dashboard UI with server-side rendering
- Role-based access control and permission enforcement
- Audit log querying and visualization
- Deployment configuration and health monitoring

The interface between the two layers is a well-defined internal API. The Python engine exposes its results through a structured data format (JSON over internal HTTP or message queue, depending on latency requirements). The TypeScript platform consumes these results and presents them through the user-facing interface.

This boundary is enforced architecturally: the Python engine has no knowledge of authentication, authorization, or UI concerns. The TypeScript platform has no knowledge of correlation algorithms, statistical methods, or numerical computation. Each layer can be developed, tested, and deployed with a degree of independence.

## Consequences

**Positive:**
- Each domain uses best-in-class tooling. Python's scientific computing ecosystem (numpy, scipy, pandas, networkx, scikit-learn) is unmatched. TypeScript's web ecosystem (Next.js, React, Prisma, Zod) is similarly dominant for the platform layer.
- Faster development velocity. Engineers working on the inference engine use the language and libraries they are most productive in for scientific computing. Engineers working on the platform use the language and frameworks they are most productive in for web and API development.
- Type safety where it matters most for security. The platform layer — which handles authentication, authorization, cryptographic operations, and API contracts — benefits from TypeScript's type system to prevent entire classes of bugs.
- Independent scaling. The inference engine and platform layer have different resource profiles (CPU-bound numerical computation vs. I/O-bound request handling) and can be scaled independently.
- Clear separation of concerns. The data boundary between layers creates a natural architectural boundary that prevents coupling between domains.

**Negative:**
- Two language ecosystems to maintain. Build tooling, dependency management, linting, testing frameworks, and CI pipelines must accommodate both Python and TypeScript.
- Serialization overhead at the boundary. Data crossing from Python to TypeScript must be serialized and deserialized, adding latency and requiring schema synchronization.
- Hiring considerations. The team must include engineers proficient in both ecosystems, or accept specialization with the coordination overhead that entails.
- Integration testing is more complex. End-to-end tests must exercise the boundary between layers, requiring test infrastructure that spans both ecosystems.
- Deployment packaging must bundle both runtimes. The air-gapped deployment package (see ADR-002) must include Python and Node.js runtimes, increasing package size and the surface area for runtime vulnerabilities.

## Alternatives Considered

**All Python (Django/Flask + scientific stack):** Use Python for both the inference engine and the platform layer, with Django or Flask for the web framework. This eliminates the two-language overhead and simplifies the build pipeline. However, Python's web ecosystem is inferior to TypeScript/Next.js for real-time dashboards, type-safe API contracts, and modern component-based UI development. Django's template system and Flask's minimalism are adequate for simple web applications but do not match Next.js for the kind of interactive, real-time infrastructure visualization that Munin requires. Python's lack of static typing (even with mypy) makes it a poor choice for security-critical platform code where type errors can translate to authorization bypass. Rejected.

**All TypeScript (Node.js + scientific libraries):** Use TypeScript for both layers, relying on libraries like mathjs, simple-statistics, or TensorFlow.js for the scientific computing. TypeScript's scientific computing ecosystem is immature compared to Python's. Libraries like numpy and scipy represent decades of optimization and validation. Reimplementing correlation analysis and statistical testing in TypeScript would be slower to develop, harder to validate, and likely slower to execute. Rejected.

**Rust (for both layers or for the engine):** Rust would provide excellent performance and memory safety for both the inference engine and the platform layer. However, Rust's development velocity for both scientific computing and web applications is significantly slower than Python and TypeScript respectively. At the current stage of product development — where iteration speed and the ability to rapidly test hypotheses about infrastructure correlation methods are critical — Rust's compile times and verbose syntax are a liability. Rust may be appropriate for performance-critical components in a future version, once the algorithms and architecture have stabilized. Rejected as premature optimization.
