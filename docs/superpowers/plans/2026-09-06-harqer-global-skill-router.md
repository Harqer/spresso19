# Harqer Global Skill Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and safely cut over to a model-agnostic Harqer skill library and one small Codex-visible Superpowers router, reducing automatically visible user skill metadata by at least 85 percent while preserving every skill and a tested rollback path.

**Architecture:** The existing dedicated repository at `/home/shaolin/harqer-rlm-api` gains a filesystem-backed, content-addressed skill library whose SQLite registry is a rebuildable search index. A deterministic router selects at most one process skill and one domain skill for the current phase, while host adapters expose that contract through a local CLI or authenticated HTTP API; the Codex adapter installs only `harqer-superpowers` into normal discovery and measures the real Codex skill surface through app-server `skills/list`. Migration is plan-first, hash-verified, archival rather than destructive, and reversible from a journaled recovery bundle.

**Tech Stack:** Python 3.12, FastAPI 0.121.2, Pydantic 2.13.4, SQLite 3 with FTS5, PyYAML 6.0.3, pytest 9.1.1, Codex app-server v2 JSON-RPC, existing `rlms==0.1.3` compatibility endpoint.

**Spec:** `docs/superpowers/specs/2026-09-06-harqer-rlm-continual-harness-design.md`

## Global Constraints

- Implement Milestone 1 only: library, inventory/import, derived index, router, Codex adapter, recovery workflow, and routing evaluation.
- Keep the core model-agnostic; no core type may depend on Codex message, tool, plugin, or filesystem conventions.
- The version directory is the skill source of truth; `registry.sqlite` must be disposable and rebuildable.
- Preserve all imported files byte-for-byte, collapse byte-identical trees by SHA-256, and namespace same-name/different-content conflicts.
- New external skill versions start `quarantined`; migration activates only validated versions covered by a verified recovery manifest.
- Keep one automatically visible user-authored skill, `harqer-superpowers`; never modify or relocate Codex-owned `~/.codex/skills/.system`.
- Exact `/skill`, `$skill`, `$harqer-superpowers name`, and `skills.load("name")` requests must resolve aliases without injecting the catalog.
- An implicit route normally selects at most one process skill and one domain skill; up to four explicit user-named skills are honored, and justified companion dependencies are reported separately.
- User and immutable project/platform policy override loaded skill instructions.
- Keep plugins with hooks, MCP servers, or apps enabled until Harqer replaces those capabilities; disable only skill-only plugins whose skill content has been imported and verified.
- The first migration permanently deletes nothing; global and redundant project skills move into a timestamped recovery bundle.
- Unit tests use temporary real files and SQLite databases. Integration tests use real Codex/FastAPI boundaries and do not weaken authentication or substitute mock services.
- Do not claim token, benchmark, or quality improvement without recorded before/after measurements. The acceptance target for visible user skill metadata is at least 85 percent reduction.
- Do not expose secrets, raw provider errors, arbitrary host paths, or imported skill bodies through logs or unauthenticated API responses.

---

## Working Directories and File Map

Run implementation tasks from `/home/shaolin/harqer-rlm-api`. The approved spec and this plan remain in `/home/shaolin/Spresso`; Harqer runtime code and commits stay in the dedicated Harqer repository.

| Path in Harqer repository | Responsibility |
| --- | --- |
| `app/skill_library/models.py` | Provider-neutral inventory, version, route, plugin, migration, and measurement contracts |
| `app/skill_library/frontmatter.py` | Strict `SKILL.md` frontmatter parsing and normalization |
| `app/skill_library/hashing.py` | Deterministic file/tree hashing and path validation |
| `app/skill_library/inventory.py` | Discover skill roots and produce a complete, conflict-aware inventory |
| `app/skill_library/plugins.py` | Read plugin manifests and distinguish skill-only from non-skill capabilities |
| `app/skill_library/registry.py` | SQLite schema, FTS index, alias resolution, and route-event persistence |
| `app/skill_library/library.py` | Immutable filesystem import, activation, rebuild, and exact body loading |
| `app/skill_library/routing.py` | Exact and deterministic implicit routing with bounded selections |
| `app/skill_library/routing-policy.yaml` | Curated process/domain kinds, aliases, companions, and safety-gate phrases |
| `app/skill_library/repl.py` | Small Python `skills.route`/`skills.load` facade for REPL-capable hosts |
| `app/skill_library/cli.py` | Model-neutral local `skills.*` command surface |
| `app/skill_library/migration.py` | Plan/apply/verify/rollback state machine and recovery journal |
| `app/skill_library/codex_adapter.py` | Codex bootstrap installation and lossless plugin-config mutation |
| `app/skill_library/codex_app_server.py` | Codex app-server `initialize` and `skills/list` measurement client |
| `app/skill_library/evaluation.py` | Golden-route evaluator and acceptance metrics |
| `app/skill_routes.py` | Authenticated FastAPI route/load endpoints |
| `adapters/codex/harqer-superpowers/` | The only user-authored skill intended to remain in Codex discovery |
| `scripts/harqer` | Repository-relative CLI launcher |
| `evals/routing/v1.yaml` | Versioned exact, implicit, forbidden, and platform-gate cases |
| `tests/unit/` | Fast offline tests over temporary files and SQLite |
| `tests/integration/` | Real CLI, Codex app-server, migration-copy, and authenticated API checks |
| `docs/global-skill-migration.md` | Operator runbook and recovery procedure |
| `docs/evidence/2026-09-06-global-skill-cutover.md` | Redacted measured baseline/cutover evidence |

## Stable Cross-Task Contracts

These names are fixed for the entire plan. Do not introduce competing aliases in later tasks.

```python
from __future__ import annotations

from enum import StrEnum
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field


class SkillState(StrEnum):
    QUARANTINED = "quarantined"
    ACTIVE = "active"
    RETIRED = "retired"
    TOMBSTONED = "tombstoned"


class SkillKind(StrEnum):
    PROCESS = "process"
    DOMAIN = "domain"


class SkillSourceKind(StrEnum):
    CODEX_USER = "codex_user"
    AGENTS_USER = "agents_user"
    REPOSITORY = "repository"
    PLUGIN = "plugin"


class SkillSource(BaseModel):
    namespace: str
    root: Path
    kind: SkillSourceKind
    protected: bool = False
    plugin_id: str | None = None


class SkillDocument(BaseModel):
    canonical_name: str
    short_name: str
    namespace: str
    description: str
    source: SkillSource
    source_directory: Path
    body_path: Path
    body_sha256: str
    tree_sha256: str
    version: str
    kind: SkillKind
    tags: tuple[str, ...] = ()
    aliases: tuple[str, ...] = ()
    companions: tuple[str, ...] = ()
    allow_implicit_invocation: bool = True


class SkillVersion(BaseModel):
    id: str
    canonical_name: str
    short_name: str
    namespace: str
    version: str
    state: SkillState
    library_path: Path
    body_sha256: str
    tree_sha256: str
    description: str
    kind: SkillKind
    tags: tuple[str, ...]
    aliases: tuple[str, ...]
    companions: tuple[str, ...]
    allow_implicit_invocation: bool


class RouteCandidate(BaseModel):
    skill_id: str
    canonical_name: str
    kind: SkillKind
    score: float
    reason: str


class RouteDecision(BaseModel):
    route_id: str
    required: tuple[str, ...] = Field(max_length=4)
    companions: tuple[str, ...] = ()
    candidates: tuple[RouteCandidate, ...] = ()
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str
```

### Task 1: Parse and Hash Skill Trees

**Files:**

- Create: `app/skill_library/__init__.py`
- Create: `app/skill_library/models.py`
- Create: `app/skill_library/frontmatter.py`
- Create: `app/skill_library/hashing.py`
- Create: `app/skill_library/routing_policy.py`
- Create: `tests/unit/test_skill_documents.py`
- Modify: `requirements.txt:1-8`
- Create: `requirements-dev.txt`

**Interfaces:**

- Consumes: A `SkillSource` plus a directory containing `SKILL.md`.
- Produces: `hash_file(path: Path) -> str`, `hash_skill_tree(root: Path) -> str`, and `parse_skill_directory(source: SkillSource, directory: Path, policy: RoutingPolicy) -> SkillDocument`.

- [ ] **Step 1: Add the parser and hashing failure cases**

```python
# tests/unit/test_skill_documents.py
from pathlib import Path

import pytest

from app.skill_library.frontmatter import SkillFormatError, parse_skill_directory
from app.skill_library.hashing import hash_skill_tree
from app.skill_library.models import SkillKind, SkillSource, SkillSourceKind
from app.skill_library.routing_policy import RoutingPolicy


def source(root: Path) -> SkillSource:
    return SkillSource(namespace="agents-user", root=root, kind=SkillSourceKind.AGENTS_USER)


def test_parse_skill_normalizes_frontmatter_and_hashes_every_file(tmp_path: Path) -> None:
    skill = tmp_path / "debugging"
    (skill / "references").mkdir(parents=True)
    (skill / "SKILL.md").write_text(
        "---\nname: debugging\ndescription: Debug failures systematically\n"
        "allow_implicit_invocation: true\ntags: [debug, tests]\n---\n# Debugging\n",
        encoding="utf-8",
    )
    (skill / "references" / "checklist.md").write_text("Observe before changing.\n", encoding="utf-8")

    document = parse_skill_directory(source(tmp_path), skill, RoutingPolicy.empty())

    assert document.canonical_name == "agents-user:debugging"
    assert document.kind is SkillKind.DOMAIN
    assert document.aliases == ("debugging",)
    first_hash = document.tree_sha256
    (skill / "references" / "checklist.md").write_text("Reproduce before changing.\n", encoding="utf-8")
    assert hash_skill_tree(skill) != first_hash


def test_parse_skill_rejects_missing_description(tmp_path: Path) -> None:
    skill = tmp_path / "broken"
    skill.mkdir()
    (skill / "SKILL.md").write_text("---\nname: broken\n---\n# Broken\n", encoding="utf-8")

    with pytest.raises(SkillFormatError, match="description"):
        parse_skill_directory(source(tmp_path), skill, RoutingPolicy.empty())


def test_hash_rejects_symlink_that_escapes_skill_tree(tmp_path: Path) -> None:
    skill = tmp_path / "unsafe"
    skill.mkdir()
    outside = tmp_path / "secret.txt"
    outside.write_text("not skill content", encoding="utf-8")
    (skill / "SKILL.md").write_text("---\nname: unsafe\ndescription: Unsafe\n---\n", encoding="utf-8")
    (skill / "escape").symlink_to(outside)

    with pytest.raises(ValueError, match="symlink"):
        hash_skill_tree(skill)
```

- [ ] **Step 2: Run the new tests and confirm the module is absent**

Run: `python -m pytest tests/unit/test_skill_documents.py -q`

Expected: FAIL during collection with `ModuleNotFoundError: No module named 'app.skill_library'`.

- [ ] **Step 3: Add pinned parsing/test dependencies**

```text
# append to requirements.txt
PyYAML==6.0.3
```

```text
# requirements-dev.txt
-r requirements.txt
pytest==9.1.1
```

- [ ] **Step 4: Implement deterministic hashing and strict frontmatter parsing**

Use SHA-256 over each sorted POSIX relative path, a NUL separator, file bytes, and a trailing NUL. Reject all symlinks in Milestone 1 so a migration can never copy bytes from outside the inventoried tree.

```python
# app/skill_library/hashing.py
from __future__ import annotations

import hashlib
from pathlib import Path


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def hash_skill_tree(root: Path) -> str:
    if not root.is_dir():
        raise ValueError(f"skill root is not a directory: {root}")
    digest = hashlib.sha256()
    for path in sorted(root.rglob("*"), key=lambda item: item.relative_to(root).as_posix()):
        relative = path.relative_to(root).as_posix()
        if path.is_symlink():
            raise ValueError(f"symlink is not allowed in a skill tree: {relative}")
        if path.is_dir():
            continue
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()
```

Implement `frontmatter.py` with `yaml.safe_load`, require a mapping, require non-empty `name` and `description`, validate names with `^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$`, use the policy for kind/aliases/companions, and default version to `"sha256-" + tree_sha256[:12]` when no semantic version is present. `body_sha256` hashes `SKILL.md`; `tree_sha256` hashes the complete directory.

Create the initial policy object in `routing_policy.py`; Task 2 adds its YAML-backed data:

```python
from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, Field

from app.skill_library.models import SkillKind


class RoutingPolicy(BaseModel):
    schema_version: int = 1
    process_skills: frozenset[str] = frozenset()
    aliases: dict[str, str] = Field(default_factory=dict)
    companions: dict[str, tuple[str, ...]] = Field(default_factory=dict)
    high_risk_phrases: dict[str, str] = Field(default_factory=dict)

    @classmethod
    def empty(cls) -> "RoutingPolicy":
        return cls()

    @classmethod
    def load(cls, path: Path) -> "RoutingPolicy":
        payload = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("routing policy must be a YAML mapping")
        return cls.model_validate(payload)

    @classmethod
    def default(cls) -> "RoutingPolicy":
        return cls.load(Path(__file__).with_name("routing-policy.yaml"))

    def kind_for(self, canonical_name: str, short_name: str) -> SkillKind:
        names = {canonical_name, short_name}
        return SkillKind.PROCESS if names & self.process_skills else SkillKind.DOMAIN
```

- [ ] **Step 5: Run the focused and full offline suites**

Run: `python -m pytest tests/unit/test_skill_documents.py -q`

Expected: `3 passed`.

Run: `python -m compileall -q app scripts tests`

Expected: exit code 0 with no output.

- [ ] **Step 6: Commit the document contract**

```bash
git add requirements.txt requirements-dev.txt app/skill_library tests/unit/test_skill_documents.py
git commit -m "feat: add deterministic skill document parsing"
```

### Task 2: Inventory Roots, Duplicates, Conflicts, and Plugin Capabilities

**Files:**

- Modify: `app/skill_library/routing_policy.py`
- Create: `app/skill_library/routing-policy.yaml`
- Create: `app/skill_library/inventory.py`
- Create: `app/skill_library/plugins.py`
- Create: `tests/unit/test_skill_inventory.py`
- Create: `tests/unit/test_plugin_inventory.py`

**Interfaces:**

- Consumes: `SkillSource`, `SkillDocument`, and plugin `.codex-plugin/plugin.json` files.
- Produces: `RoutingPolicy.load(path: Path) -> RoutingPolicy`, `InventoryScanner.scan(sources: tuple[SkillSource, ...]) -> InventoryReport`, and `read_plugin_manifest(plugin_id: str, root: Path) -> PluginCapabilityReport`.

- [ ] **Step 1: Write inventory tests over real temporary trees**

```python
# tests/unit/test_skill_inventory.py
from pathlib import Path

from app.skill_library.inventory import InventoryScanner
from app.skill_library.models import SkillSource, SkillSourceKind
from app.skill_library.routing_policy import RoutingPolicy


def write_skill(root: Path, name: str, description: str, body: str) -> None:
    directory = root / name
    directory.mkdir(parents=True)
    (directory / "SKILL.md").write_text(
        f"---\nname: {name}\ndescription: {description}\n---\n{body}\n",
        encoding="utf-8",
    )


def test_inventory_collapses_identical_content_and_records_name_conflicts(tmp_path: Path) -> None:
    first = tmp_path / "agents"
    second = tmp_path / "codex"
    write_skill(first, "review", "Review code", "# Same")
    write_skill(second, "review", "Review code", "# Same")
    write_skill(second, "debug", "Debug code", "# Different")
    write_skill(first, "debug", "Debug code safely", "# Conflict")
    sources = (
        SkillSource(namespace="agents", root=first, kind=SkillSourceKind.AGENTS_USER),
        SkillSource(namespace="codex", root=second, kind=SkillSourceKind.CODEX_USER),
    )

    report = InventoryScanner(RoutingPolicy.empty()).scan(sources)

    assert report.document_count == 4
    assert len(report.duplicate_groups) == 1
    assert set(report.conflicts["debug"]) == {"agents:debug", "codex:debug"}
    assert report.total_description_chars == len("Review code") * 2 + len("Debug code") + len("Debug code safely")


def test_protected_system_root_is_reported_but_never_migratable(tmp_path: Path) -> None:
    write_skill(tmp_path, "system-skill", "Owned by Codex", "# System")
    source = SkillSource(
        namespace="codex-system",
        root=tmp_path,
        kind=SkillSourceKind.CODEX_USER,
        protected=True,
    )

    report = InventoryScanner(RoutingPolicy.empty()).scan((source,))

    assert report.documents[0].source.protected is True
    assert report.migratable_count == 0
```

- [ ] **Step 2: Write plugin capability tests that prevent unsafe disablement**

```python
# tests/unit/test_plugin_inventory.py
import json
from pathlib import Path

from app.skill_library.plugins import read_plugin_manifest


def test_skill_only_plugin_can_be_disabled_after_verified_import(tmp_path: Path) -> None:
    manifest_dir = tmp_path / ".codex-plugin"
    manifest_dir.mkdir()
    (manifest_dir / "plugin.json").write_text(
        json.dumps({"name": "superpowers", "version": "6.3.0", "skills": "./skills/", "hooks": {}}),
        encoding="utf-8",
    )
    report = read_plugin_manifest("superpowers@source", tmp_path)
    assert report.skill_root == tmp_path / "skills"
    assert report.non_skill_capabilities == ()
    assert report.safe_to_disable_after_import is True


def test_mcp_and_hook_plugin_is_retained(tmp_path: Path) -> None:
    manifest_dir = tmp_path / ".codex-plugin"
    manifest_dir.mkdir()
    (manifest_dir / "plugin.json").write_text(
        json.dumps({"name": "memory", "skills": "./skills/", "mcpServers": "./.mcp.json", "hooks": "./hooks.json"}),
        encoding="utf-8",
    )
    report = read_plugin_manifest("memory@source", tmp_path)
    assert report.non_skill_capabilities == ("hooks", "mcpServers")
    assert report.safe_to_disable_after_import is False
```

- [ ] **Step 3: Run both files and verify failure**

Run: `python -m pytest tests/unit/test_skill_inventory.py tests/unit/test_plugin_inventory.py -q`

Expected: FAIL because `InventoryScanner` and `read_plugin_manifest` do not exist.

- [ ] **Step 4: Implement inventory and plugin reports**

Add these Pydantic models to `models.py`:

```python
class DuplicateGroup(BaseModel):
    tree_sha256: str
    canonical_names: tuple[str, ...]
    source_directories: tuple[Path, ...]


class InventoryIssue(BaseModel):
    source_directory: Path
    code: Literal["invalid_frontmatter", "unsafe_path", "missing_body"]
    message: str


class InventoryReport(BaseModel):
    schema_version: Literal[1] = 1
    documents: tuple[SkillDocument, ...]
    duplicate_groups: tuple[DuplicateGroup, ...]
    conflicts: dict[str, tuple[str, ...]]
    issues: tuple[InventoryIssue, ...]
    document_count: int
    migratable_count: int
    total_description_chars: int


class PluginCapabilityReport(BaseModel):
    plugin_id: str
    plugin_root: Path
    skill_root: Path | None
    non_skill_capabilities: tuple[str, ...]
    safe_to_disable_after_import: bool
```

`InventoryScanner.scan` must inspect only immediate child directories containing `SKILL.md`, retain issues instead of silently dropping malformed skills, group identical `tree_sha256` values, and record every short-name collision with more than one distinct tree hash. `plugins.py` must treat non-empty `apps`, `commands`, `hooks`, and `mcpServers` fields as non-skill capabilities; an empty object or empty list is not a capability.

Define the initial policy with explicit process categories and safety companions:

```yaml
schema_version: 1
process_skills:
  - brainstorming
  - dispatching-parallel-agents
  - executing-plans
  - finishing-a-development-branch
  - receiving-code-review
  - requesting-code-review
  - subagent-driven-development
  - systematic-debugging
  - test-driven-development
  - using-git-worktrees
  - using-superpowers
  - verification-before-completion
  - writing-plans
  - writing-skills
aliases:
  superpowers:using-superpowers: using-superpowers
companions:
  mwdat-android:camera-streaming:
    - mwdat-android:permissions-registration
    - mwdat-android:session-lifecycle
  mwdat-android:display-access:
    - mwdat-android:permissions-registration
    - mwdat-android:session-lifecycle
high_risk_phrases:
  "com.meta.wearable": mwdat-android:dat-conventions
  "client.interactions": gemini-interactions-api
  "ephemeral token": gemini-live-api-dev
  "functions/src/ai": developing-genkit-js
```

- [ ] **Step 5: Run inventory tests**

Run: `python -m pytest tests/unit/test_skill_inventory.py tests/unit/test_plugin_inventory.py -q`

Expected: `4 passed`.

- [ ] **Step 6: Commit the inventory boundary**

```bash
git add app/skill_library tests/unit/test_skill_inventory.py tests/unit/test_plugin_inventory.py
git commit -m "feat: inventory skills and plugin capabilities"
```

### Task 3: Import an Immutable Filesystem Library and Rebuildable SQLite Registry

**Files:**

- Create: `app/skill_library/registry.py`
- Create: `app/skill_library/library.py`
- Create: `tests/unit/test_skill_library.py`

**Interfaces:**

- Consumes: `InventoryReport` from Task 2 and a `state_root: Path`.
- Produces: `SkillRegistry.initialize() -> None`, `SkillRegistry.rebuild(library_root: Path) -> None`, `SkillRegistry.resolve(reference: str) -> SkillVersion`, `SkillRegistry.get(skill_id: str) -> SkillVersion`, `SkillRegistry.search(query: str, limit: int = 20) -> tuple[RouteCandidate, ...]`, `SkillRegistry.close() -> None`, `SkillLibrary.create(state_root: Path, rebuild: bool = False) -> SkillLibrary`, `SkillLibrary.import_inventory(report: InventoryReport) -> ImportReport`, `SkillLibrary.activate(skill_ids: tuple[str, ...]) -> None`, `SkillLibrary.read_manifest(version: SkillVersion) -> SkillManifest`, `SkillLibrary.load(reference: str) -> LoadedSkill`, and `SkillLibrary.read_text(reference: str, relative_path: str, max_bytes: int = 1_000_000) -> str`. `SkillLibrary.state_root` is the normalized constructor path.

- [ ] **Step 1: Write deduplication, conflict, rebuild, and traversal tests**

```python
# tests/unit/test_skill_library.py
from pathlib import Path

import pytest

from app.skill_library.inventory import InventoryScanner
from app.skill_library.library import SkillLibrary
from app.skill_library.models import SkillSource, SkillSourceKind
from app.skill_library.registry import SkillRegistry
from app.skill_library.routing_policy import RoutingPolicy


def make_inventory(tmp_path: Path, entries: tuple[tuple[str, str, str, str], ...]):
    sources = []
    for namespace, name, description, body in entries:
        root = tmp_path / namespace
        directory = root / name
        directory.mkdir(parents=True)
        (directory / "SKILL.md").write_text(
            f"---\nname: {name}\ndescription: {description}\n---\n{body}\n",
            encoding="utf-8",
        )
        if not any(item.namespace == namespace for item in sources):
            sources.append(SkillSource(namespace=namespace, root=root, kind=SkillSourceKind.REPOSITORY))
    return InventoryScanner(RoutingPolicy.empty()).scan(tuple(sources))


def activate_all(library: SkillLibrary, report) -> None:
    library.activate(tuple(version.id for version in report.versions))


def test_identical_trees_share_one_version_and_keep_all_provenance(tmp_path: Path) -> None:
    inventory = make_inventory(
        tmp_path,
        (
            ("agents", "review", "Review code", "# Same"),
            ("codex", "review", "Review code", "# Same"),
        ),
    )
    library = SkillLibrary.create(tmp_path / "state")
    report = library.import_inventory(inventory)

    assert report.documents_seen == 2
    assert report.unique_versions_written == 1
    activate_all(library, report)
    version = library.registry.resolve("review")
    manifest = library.read_manifest(version)
    assert len(manifest.sources) == 2


def test_same_name_different_content_requires_namespace(tmp_path: Path) -> None:
    inventory = make_inventory(
        tmp_path,
        (
            ("agents", "debug", "Debug code", "# First"),
            ("codex", "debug", "Debug code safely", "# Second"),
        ),
    )
    library = SkillLibrary.create(tmp_path / "state")
    report = library.import_inventory(inventory)
    activate_all(library, report)

    with pytest.raises(LookupError, match="ambiguous"):
        library.load("debug")
    assert library.load("agents:debug").body.startswith("---")
    assert library.load("codex:debug").body.startswith("---")


def test_registry_rebuilds_from_manifests_after_database_loss(tmp_path: Path) -> None:
    inventory = make_inventory(tmp_path, (("agents", "review", "Review code", "# Review"),))
    library = SkillLibrary.create(tmp_path / "state")
    report = library.import_inventory(inventory)
    activate_all(library, report)
    library.registry.close()
    library.registry.path.unlink()

    rebuilt = SkillLibrary.create(tmp_path / "state", rebuild=True)

    assert rebuilt.registry.resolve("review").short_name == "review"


def test_load_rejects_path_syntax(tmp_path: Path) -> None:
    inventory = make_inventory(tmp_path, (("agents", "review", "Review code", "# Review"),))
    library = SkillLibrary.create(tmp_path / "state")
    report = library.import_inventory(inventory)
    activate_all(library, report)
    with pytest.raises(ValueError, match="skill reference"):
        library.load("../../etc/passwd")


def test_read_text_stays_inside_selected_version(tmp_path: Path) -> None:
    inventory = make_inventory(tmp_path, (("agents", "review", "Review code", "# Review"),))
    library = SkillLibrary.create(tmp_path / "state")
    report = library.import_inventory(inventory)
    activate_all(library, report)
    with pytest.raises(ValueError, match="relative path"):
        library.read_text("review", "../../outside.txt")
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `python -m pytest tests/unit/test_skill_library.py -q`

Expected: FAIL because `SkillLibrary` and `SkillRegistry` do not exist.

- [ ] **Step 3: Create the SQLite schema and transaction rules**

`SkillRegistry.initialize()` must execute this schema in one transaction and enable foreign keys, WAL, and a 5-second busy timeout:

```sql
CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  namespace TEXT NOT NULL,
  version TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('quarantined','active','retired','tombstoned')),
  library_path TEXT NOT NULL,
  body_sha256 TEXT NOT NULL,
  tree_sha256 TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('process','domain')),
  tags_json TEXT NOT NULL,
  companions_json TEXT NOT NULL,
  allow_implicit_invocation INTEGER NOT NULL CHECK (allow_implicit_invocation IN (0,1)),
  manifest_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS skill_aliases (
  alias TEXT NOT NULL,
  skill_id TEXT NOT NULL REFERENCES skill_versions(id),
  source_path TEXT NOT NULL,
  is_default INTEGER NOT NULL CHECK (is_default IN (0,1)),
  PRIMARY KEY (alias, skill_id, source_path)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_default_skill_per_alias
ON skill_aliases(alias) WHERE is_default = 1;
CREATE VIRTUAL TABLE IF NOT EXISTS skill_fts USING fts5(
  skill_id UNINDEXED,
  canonical_name,
  short_name,
  description,
  tags,
  tokenize='porter unicode61'
);
CREATE TABLE IF NOT EXISTS route_events (
  route_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  task_sha256 TEXT NOT NULL,
  phase TEXT NOT NULL,
  explicit_json TEXT NOT NULL,
  candidates_json TEXT NOT NULL,
  selected_json TEXT NOT NULL,
  companions_json TEXT NOT NULL,
  latency_ms REAL NOT NULL,
  outcome TEXT
);
```

- [ ] **Step 4: Implement immutable import and activation**

For a unique tree, write into a temporary sibling directory, copy with `shutil.copytree(document.source_directory, staging_path, symlinks=False)`, verify every copied relative-path hash, write `manifest.json`, `fsync` files and directory, then publish with `os.replace`. Use `library_root / namespace / short_name / version` as the version path. Build the first immutable manifest from every duplicate source in the complete inventory. On a later import of the same `tree_sha256`, append newly observed provenance to `skills/provenance.jsonl` and add registry aliases without rewriting the version directory. Run registry updates only after filesystem publication or durable provenance append succeeds.

The public result types are:

```python
class SkillManifest(BaseModel):
    schema_version: Literal[1] = 1
    skill: SkillVersion
    sources: tuple[SkillSource, ...]
    source_directories: tuple[Path, ...]
    installed_at: str


class AliasRecord(BaseModel):
    default_skill_id: str | None
    candidate_skill_ids: tuple[str, ...]


class AliasFile(BaseModel):
    schema_version: Literal[1] = 1
    aliases: dict[str, AliasRecord]


class ImportReport(BaseModel):
    documents_seen: int
    unique_versions_written: int
    duplicates_reused: int
    versions: tuple[SkillVersion, ...]
    unresolved_issues: tuple[InventoryIssue, ...]


class LoadedSkill(BaseModel):
    skill: SkillVersion
    body: str
    reference_files: tuple[Path, ...]
```

Write `skills/aliases.json` atomically as the durable alias source of truth. Canonical names always have one default ID. A short name shared by different tree hashes has `default_skill_id: null` until a reviewed policy chooses one, so `resolve` raises an ambiguity rather than silently selecting content. A short name shared only by deduplicated sources has one default ID. Write lifecycle transitions to append-only `skills/state-events.jsonl` and atomically materialize current values in `skills/state.json`; activation must never rewrite an immutable version manifest. `SkillRegistry.rebuild` reads every immutable `manifest.json`, `skills/aliases.json`, `skills/provenance.jsonl`, and `skills/state.json`; deleting SQLite must not lose aliases, provenance, or activation state.

Reserve generated `manifest.json` at the version root. If a source tree already contains that filename, record an `invalid_frontmatter` inventory issue explaining the collision and block cutover rather than overwriting it. The recorded source tree hash covers only inventoried source files; verification ignores the generated manifest after publication.

Activation must be a separate `SkillLibrary.activate(skill_ids: tuple[str, ...])` transaction after import verification. `load` accepts only the name grammar from Task 1 and only returns `active` versions. `read_text` resolves the requested path beneath the selected version with `Path.resolve()` plus `is_relative_to(version.library_path.resolve())`, rejects symlinks and non-files, enforces `max_bytes` before reading, and decodes strict UTF-8.

- [ ] **Step 5: Run library tests and prove rebuildability**

Run: `python -m pytest tests/unit/test_skill_library.py -q`

Expected: all tests pass, including the test that deletes and rebuilds `registry.sqlite`.

- [ ] **Step 6: Commit the library and index**

```bash
git add app/skill_library/registry.py app/skill_library/library.py tests/unit/test_skill_library.py
git commit -m "feat: add immutable skill library and registry"
```

### Task 4: Route Exact and Implicit Skill Requests Without Loading the Catalog

**Files:**

- Create: `app/skill_library/routing.py`
- Create: `tests/unit/test_skill_routing.py`
- Modify: `app/skill_library/registry.py`
- Modify: `app/skill_library/routing-policy.yaml`

**Interfaces:**

- Consumes: `SkillRegistry.resolve`, `SkillRegistry.search`, and `RoutingPolicy`.
- Produces: `SkillRouter.route(task: str, phase: str = "start", explicit: tuple[str, ...] = (), constraints: tuple[str, ...] = ()) -> RouteDecision`.

- [ ] **Step 1: Write routing limit, exact alias, no-match, and gate tests**

```python
# tests/unit/test_skill_routing.py
from pathlib import Path

import pytest

from app.skill_library.inventory import InventoryScanner
from app.skill_library.library import SkillLibrary
from app.skill_library.models import SkillKind, SkillSource, SkillSourceKind
from app.skill_library.routing import SkillRouter
from app.skill_library.routing_policy import RoutingPolicy


def write_skill(root: Path, name: str, description: str) -> None:
    directory = root / name
    directory.mkdir(parents=True)
    (directory / "SKILL.md").write_text(
        f"---\nname: {name}\ndescription: {description}\n---\n# {name}\n",
        encoding="utf-8",
    )


@pytest.fixture
def router(tmp_path: Path) -> SkillRouter:
    process_root = tmp_path / "superpowers"
    dat_root = tmp_path / "mwdat"
    domain_root = tmp_path / "android"
    write_skill(process_root, "ponytail", "Use ponytail workflow exactly when named")
    write_skill(process_root, "test-driven-development", "Use test driven development before implementation")
    write_skill(dat_root, "camera-streaming", "Meta wearable Camera API streaming")
    write_skill(dat_root, "permissions-registration", "Meta wearable registration and permission flow")
    write_skill(dat_root, "session-lifecycle", "Meta wearable device session lifecycle")
    write_skill(domain_root, "camerax", "Implement Android CameraX streams")
    policy = RoutingPolicy(
        process_skills=frozenset({"ponytail", "test-driven-development"}),
        companions={
            "mwdat-android:camera-streaming": (
                "mwdat-android:permissions-registration",
                "mwdat-android:session-lifecycle",
            )
        },
        high_risk_phrases={"com.meta.wearable": "mwdat-android:camera-streaming"},
    )
    sources = (
        SkillSource(namespace="superpowers", root=process_root, kind=SkillSourceKind.PLUGIN),
        SkillSource(namespace="mwdat-android", root=dat_root, kind=SkillSourceKind.PLUGIN),
        SkillSource(namespace="android", root=domain_root, kind=SkillSourceKind.AGENTS_USER),
    )
    inventory = InventoryScanner(policy).scan(sources)
    library = SkillLibrary.create(tmp_path / "state")
    imported = library.import_inventory(inventory)
    library.activate(tuple(version.id for version in imported.versions))
    return SkillRouter(library.registry, policy)


def test_exact_alias_wins_without_returning_unselected_bodies(router) -> None:
    decision = router.route("review this code", explicit=("$ponytail",))
    assert len(decision.required) == 1
    assert decision.candidates[0].canonical_name.endswith(":ponytail")
    assert decision.reason == "explicit invocation"


def test_multiple_explicit_requests_are_all_honored(router) -> None:
    decision = router.route(
        "Apply the named workflows",
        explicit=("$ponytail", "/test-driven-development"),
    )
    assert len(decision.required) == 2
    assert {item.canonical_name.rsplit(":", 1)[-1] for item in decision.candidates} == {
        "ponytail",
        "test-driven-development",
    }


def test_implicit_route_selects_at_most_one_process_and_one_domain(router) -> None:
    decision = router.route("Use test driven development to fix this CameraX stream")
    kinds = [router.registry.get(skill_id).kind for skill_id in decision.required]
    assert kinds.count(SkillKind.PROCESS) <= 1
    assert kinds.count(SkillKind.DOMAIN) <= 1
    assert len(decision.required) <= 2


def test_irrelevant_task_returns_no_required_skill(router) -> None:
    decision = router.route("Write a four-line poem about rain on glass")
    assert decision.required == ()
    assert decision.confidence == 0.0


def test_platform_gate_adds_declared_companions(router) -> None:
    decision = router.route("Modify com.meta.wearable camera streaming lifecycle", phase="pre-edit")
    selected = [router.registry.get(skill_id).canonical_name for skill_id in decision.required]
    companions = [router.registry.get(skill_id).canonical_name for skill_id in decision.companions]
    assert any(name.endswith(":camera-streaming") for name in selected)
    assert any(name.endswith(":permissions-registration") for name in companions)
    assert any(name.endswith(":session-lifecycle") for name in companions)
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `python -m pytest tests/unit/test_skill_routing.py -q`

Expected: FAIL with `ModuleNotFoundError: No module named 'app.skill_library.routing'`.

- [ ] **Step 3: Implement a deterministic two-stage router**

```python
# app/skill_library/routing.py
from __future__ import annotations

import hashlib
import re
import time
import uuid

from app.skill_library.models import RouteCandidate, RouteDecision, SkillKind

TERM = re.compile(r"[a-z0-9][a-z0-9_.:+-]*")
EXPLICIT = re.compile(r"(?:^|\s)[/$]([A-Za-z0-9][A-Za-z0-9_.:-]{0,127})(?:\s|$)")
STOPWORDS = frozenset(
    {
        "a", "an", "and", "before", "create", "for", "implement", "in", "of",
        "on", "please", "the", "this", "to", "use", "with", "write",
    }
)


class SkillRouter:
    def __init__(self, registry, policy, implicit_threshold: float = 0.34) -> None:
        self.registry = registry
        self.policy = policy
        self.implicit_threshold = implicit_threshold

    def route(
        self,
        task: str,
        phase: str = "start",
        explicit: tuple[str, ...] = (),
        constraints: tuple[str, ...] = (),
    ) -> RouteDecision:
        started = time.perf_counter()
        requested = tuple(item.lstrip("/$") for item in explicit) or tuple(EXPLICIT.findall(task))
        if requested:
            versions = tuple(self.registry.resolve(name) for name in requested)
            return self._record(
                task=task,
                phase=phase,
                explicit=requested,
                required=tuple(version.id for version in versions[:4]),
                companions=self._companions(versions),
                candidates=tuple(
                    RouteCandidate(
                        skill_id=version.id,
                        canonical_name=version.canonical_name,
                        kind=version.kind,
                        score=1.0,
                        reason="exact alias",
                    )
                    for version in versions
                ),
                confidence=1.0,
                reason="explicit invocation",
                started=started,
            )

        query = " ".join((task, phase, *constraints)).lower()
        candidates = self._rank(query)
        selected: list[RouteCandidate] = []
        for kind in (SkillKind.PROCESS, SkillKind.DOMAIN):
            match = next((item for item in candidates if item.kind is kind and item.score >= self.implicit_threshold), None)
            if match is not None:
                selected.append(match)
        required = tuple(item.skill_id for item in selected)
        versions = tuple(self.registry.get(skill_id) for skill_id in required)
        confidence = min(1.0, max((item.score for item in selected), default=0.0))
        return self._record(
            task=task,
            phase=phase,
            explicit=(),
            required=required,
            companions=self._companions(versions),
            candidates=tuple(candidates[:5]),
            confidence=confidence,
            reason="implicit metadata match" if required else "no useful match",
            started=started,
        )
```

Complete `_rank` by removing `STOPWORDS`, taking at most 20 FTS candidates, and re-ranking deterministically. A configured high-risk phrase is score `1.0`; exact canonical/short-name term match contributes `0.55`; tag overlap contributes up to `0.25`; description-term overlap contributes up to `0.20`; and a matching phase tag contributes `0.10`, capped at `1.0`. Prior accepted route evidence may break a score tie but may not override a high-risk phrase, explicit invocation, or forbidden skill. No model call or embedding is allowed in Milestone 1. Complete `_record` by generating a UUID, SHA-256 hashing the task before persistence, storing candidate/selection JSON and latency, and returning `RouteDecision`; raw task text must not enter `route_events`.

- [ ] **Step 4: Make ambiguity and untrusted-state behavior fail closed**

`SkillRegistry.resolve` must reject ambiguous short names and non-active states. `SkillRegistry.search` must include only active versions with `allow_implicit_invocation=1`, quote/sanitize FTS input terms, and return metadata only. The router must surface `LookupError` for a bad explicit request and must never silently replace it with an implicit match.

- [ ] **Step 5: Run routing and regression tests**

Run: `python -m pytest tests/unit/test_skill_routing.py tests/unit/test_skill_library.py -q`

Expected: all tests pass.

- [ ] **Step 6: Commit the router**

```bash
git add app/skill_library/routing.py app/skill_library/registry.py app/skill_library/routing-policy.yaml tests/unit/test_skill_routing.py
git commit -m "feat: add bounded deterministic skill routing"
```

### Task 5: Expose the Portable CLI and REPL-Shaped Contract

**Files:**

- Create: `app/skill_library/cli.py`
- Create: `app/skill_library/repl.py`
- Create: `scripts/harqer`
- Create: `tests/integration/test_skill_cli.py`
- Create: `tests/unit/test_skill_repl.py`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: `InventoryScanner`, `SkillLibrary`, `SkillRegistry`, and `SkillRouter`.
- Produces: `SkillRepl.open(state_root: Path, policy: RoutingPolicy | None = None) -> SkillRepl`, `SkillRepl.route(task: str, phase: str = "start", explicit: tuple[str, ...] = (), constraints: tuple[str, ...] = ()) -> RouteDecision`, `SkillRepl.load(reference: str) -> LoadedSkill`, `SkillRepl.read_text(reference: str, relative_path: str) -> str`, `main(argv: list[str] | None = None) -> int`, and the commands `harqer skills inventory|import|activate|route|load|read-text|status|rebuild`.

- [ ] **Step 1: Write end-to-end CLI tests using a temporary state root**

```python
# tests/integration/test_skill_cli.py
import json
import subprocess
from pathlib import Path


def run_cli(repo: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(repo / "scripts" / "harqer"), *args],
        cwd=repo,
        text=True,
        capture_output=True,
        check=False,
    )


def test_inventory_import_route_and_load(tmp_path: Path) -> None:
    repo_root = Path(__file__).resolve().parents[2]
    skill_source = tmp_path / "source"
    skill = skill_source / "debugging"
    skill.mkdir(parents=True)
    (skill / "SKILL.md").write_text(
        "---\nname: debugging\ndescription: Debug failing tests systematically\n---\n# Debugging\n",
        encoding="utf-8",
    )
    state = tmp_path / "state"
    inventory = tmp_path / "inventory.json"
    result = run_cli(
        repo_root,
        "skills", "inventory",
        "--source", f"fixture:agents_user:{skill_source}",
        "--output", str(inventory),
    )
    assert result.returncode == 0, result.stderr

    result = run_cli(repo_root, "skills", "import", "--state-root", str(state), "--inventory", str(inventory))
    assert result.returncode == 0, result.stderr
    imported = json.loads(result.stdout)
    ids = tuple(item["id"] for item in imported["versions"])

    activation_args = [argument for skill_id in ids for argument in ("--skill-id", skill_id)]
    result = run_cli(repo_root, "skills", "activate", "--state-root", str(state), *activation_args)
    assert result.returncode == 0, result.stderr

    result = run_cli(repo_root, "skills", "route", "--state-root", str(state), "--task", "debug the failing tests")
    decision = json.loads(result.stdout)
    assert len(decision["required"]) <= 2

    result = run_cli(repo_root, "skills", "load", "--state-root", str(state), "--reference", "debugging", "--body-only")
    assert result.returncode == 0, result.stderr
    assert result.stdout.startswith("---")
```

- [ ] **Step 2: Run the CLI test and verify failure**

Run: `python -m pytest tests/integration/test_skill_cli.py -q`

Expected: FAIL because `scripts/harqer` does not exist.

- [ ] **Step 3: Write and implement the in-process REPL facade**

```python
# tests/unit/test_skill_repl.py
from pathlib import Path

from app.skill_library.inventory import InventoryScanner
from app.skill_library.library import SkillLibrary
from app.skill_library.models import SkillSource, SkillSourceKind
from app.skill_library.repl import SkillRepl
from app.skill_library.routing_policy import RoutingPolicy


def test_repl_exposes_route_then_exact_load(tmp_path: Path) -> None:
    source_root = tmp_path / "source"
    skill = source_root / "debugging"
    skill.mkdir(parents=True)
    (skill / "SKILL.md").write_text(
        "---\nname: debugging\ndescription: Debug failing tests\n---\n# Debugging\n",
        encoding="utf-8",
    )
    source = SkillSource(namespace="fixture", root=source_root, kind=SkillSourceKind.REPOSITORY)
    inventory = InventoryScanner(RoutingPolicy.empty()).scan((source,))
    library = SkillLibrary.create(tmp_path / "state")
    imported = library.import_inventory(inventory)
    library.activate(tuple(version.id for version in imported.versions))

    skills = SkillRepl.open(library.state_root)
    decision = skills.route("debug the failing tests", phase="diagnosis", explicit=("debugging",))
    assert decision.required
    loaded = skills.load(decision.required[0])
    assert loaded.body.startswith("---")
    assert loaded.skill.id == decision.required[0]
```

```python
# app/skill_library/repl.py
from __future__ import annotations

from pathlib import Path

from app.skill_library.library import LoadedSkill, SkillLibrary
from app.skill_library.models import RouteDecision
from app.skill_library.routing import SkillRouter
from app.skill_library.routing_policy import RoutingPolicy


class SkillRepl:
    def __init__(self, library: SkillLibrary, router: SkillRouter) -> None:
        self.library = library
        self.router = router
        self.state_root = library.state_root

    @classmethod
    def open(cls, state_root: Path, policy: RoutingPolicy | None = None) -> "SkillRepl":
        library = SkillLibrary.create(state_root)
        resolved_policy = policy or RoutingPolicy.default()
        return cls(library, SkillRouter(library.registry, resolved_policy))

    def route(
        self,
        task: str,
        phase: str = "start",
        explicit: tuple[str, ...] = (),
        constraints: tuple[str, ...] = (),
    ) -> RouteDecision:
        return self.router.route(task, phase, explicit, constraints)

    def load(self, reference: str) -> LoadedSkill:
        return self.library.load(reference)

    def read_text(self, reference: str, relative_path: str) -> str:
        return self.library.read_text(reference, relative_path)
```

Run: `python -m pytest tests/unit/test_skill_repl.py -q`

Expected after implementation: PASS. This is the provider-neutral REPL contract. Codex calls the same operations through the CLI adapter; the FastAPI adapter uses them in Task 8. Automatic persistent-kernel injection remains Milestone 2.

- [ ] **Step 4: Implement the repository-relative launcher**

```bash
#!/usr/bin/env bash
set -euo pipefail
HARQER_SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
HARQER_REPOSITORY_ROOT="$(cd -- "${HARQER_SCRIPT_DIR}/.." && pwd)"
export PYTHONPATH="${HARQER_REPOSITORY_ROOT}${PYTHONPATH:+:${PYTHONPATH}}"
exec "${PYTHON:-python3}" -m app.skill_library.cli "$@"
```

Mark `scripts/harqer` executable. Add `.harqer-test-state/` to `.gitignore`; never add `~/.harqer` or absolute user paths to the repository.

- [ ] **Step 5: Implement the CLI with JSON on stdout and diagnostics on stderr**

Use `argparse`; accept `--state-root` on every stateful command and default it with `Path(os.environ.get("HARQER_STATE_ROOT", Path.home() / ".harqer"))`. `inventory` is read-only. `import` remains quarantined. `activate` accepts repeated `--skill-id`. `route` accepts `--task`, `--phase`, repeated `--explicit`, and repeated `--constraint`. `load` accepts `--reference`, `--body-only`, or `--for-agent`; the last form prints canonical ID, library directory, `SKILL.md`, and relative reference/script/asset paths without reading those secondary files. `read-text` accepts `--reference` plus `--path` and calls the traversal-safe `SkillLibrary.read_text`. All JSON uses Pydantic `model_dump_json(indent=2)`.

Return codes are stable:

```python
EXIT_OK = 0
EXIT_INPUT = 2
EXIT_NOT_FOUND = 3
EXIT_VERIFY = 4
EXIT_CONFLICT = 5
EXIT_INTERNAL = 70
```

Catch only typed CLI boundary errors, print a stable JSON error object to stderr, and allow unexpected exceptions to produce a non-zero traceback during development. Never print catalog bodies from `inventory`, `route`, or `status`.

- [ ] **Step 6: Run CLI and offline suites**

Run: `python -m pytest tests/unit tests/integration/test_skill_cli.py -q`

Expected: all tests pass without provider credentials or network access.

Run: `scripts/harqer skills status --state-root /tmp/harqer-empty-state`

Expected: JSON reports an initialized empty library and zero active versions.

- [ ] **Step 7: Commit the CLI and REPL bridges**

```bash
git add .gitignore app/skill_library/cli.py app/skill_library/repl.py scripts/harqer tests/unit/test_skill_repl.py tests/integration/test_skill_cli.py
git commit -m "feat: expose portable skill library CLI"
```

### Task 6: Install the Small Codex Bootstrap and Measure Codex's Actual Skill Surface

**Files:**

- Create: `adapters/codex/harqer-superpowers/SKILL.md`
- Create: `adapters/codex/harqer-superpowers/agents/openai.yaml`
- Create: `app/skill_library/codex_adapter.py`
- Create: `app/skill_library/codex_app_server.py`
- Create: `tests/unit/test_codex_adapter.py`
- Create: `tests/integration/test_codex_app_server.py`

**Interfaces:**

- Consumes: the `scripts/harqer` executable, a `codex_home: Path`, and Codex app-server v2.
- Produces: `CodexAdapter.install_router(codex_home: Path, launcher: Path, bin_directory: Path) -> RouterInstall`, `CodexAdapter.set_plugin_enabled(config_path: Path, plugin_id: str, enabled: bool, expected_sha256: str) -> str`, `CodexAppServerClient.list_skills(cwd: Path, force_reload: bool = True) -> CodexSkillSurface`, and `measure_surface(entries: list[dict]) -> SkillSurfaceMeasurement`.

```python
class RouterInstall(BaseModel):
    skill_path: Path
    launcher_path: Path
    skill_tree_sha256: str
    previous_skill_backup: Path | None = None


class CodexSkillSurface(BaseModel):
    cwd: Path
    entries: tuple[dict, ...]
    errors: tuple[dict, ...]


class SkillSurfaceMeasurement(BaseModel):
    visible_user_skill_count: int
    visible_user_description_chars: int
    visible_user_metadata_chars: int
    visible_system_skill_count: int
    normalized_metadata_sha256: str
    skill_names: tuple[str, ...]
    errors: tuple[dict, ...]
```

- [ ] **Step 1: Write bootstrap installation and lossless config tests**

```python
# tests/unit/test_codex_adapter.py
from pathlib import Path

from app.skill_library.codex_adapter import CodexAdapter
from app.skill_library.hashing import hash_file


def test_install_router_creates_only_one_discoverable_skill(tmp_path: Path) -> None:
    repo_root = Path(__file__).resolve().parents[2]
    codex_home = tmp_path / ".codex"
    install = CodexAdapter(repo_root).install_router(
        codex_home,
        repo_root / "scripts" / "harqer",
        tmp_path / ".local" / "bin",
    )
    discovered = sorted(path.parent.name for path in (codex_home / "skills").glob("*/SKILL.md"))
    assert discovered == ["harqer-superpowers"]
    assert install.skill_path == codex_home / "skills" / "harqer-superpowers"
    assert install.launcher_path.is_symlink()


def test_plugin_edit_changes_only_requested_enabled_value(tmp_path: Path) -> None:
    repo_root = Path(__file__).resolve().parents[2]
    config = tmp_path / "config.toml"
    original = '[plugins."superpowers@dev"]\nenabled = true\n\n[features]\nhooks = true\n'
    config.write_text(original, encoding="utf-8")
    adapter = CodexAdapter(repo_root)

    new_hash = adapter.set_plugin_enabled(config, "superpowers@dev", False, hash_file(config))

    assert config.read_text(encoding="utf-8") == original.replace("enabled = true", "enabled = false", 1)
    assert new_hash == hash_file(config)
```

- [ ] **Step 2: Write surface measurement tests**

```python
# tests/integration/test_codex_app_server.py
from app.skill_library.codex_app_server import measure_surface


def test_measure_surface_excludes_system_and_disabled_skills() -> None:
    response = [
        {"scope": "system", "enabled": True, "name": "imagegen", "description": "Generate images", "path": "/system/imagegen"},
        {"scope": "user", "enabled": True, "name": "debugging", "description": "Debug failures", "path": "/user/debugging"},
        {"scope": "user", "enabled": False, "name": "old", "description": "Old skill", "path": "/user/old"},
    ]
    measured = measure_surface(response)
    assert measured.visible_user_skill_count == 1
    assert measured.visible_user_description_chars == len("Debug failures")
    assert measured.visible_user_metadata_chars > measured.visible_user_description_chars
    assert measured.visible_system_skill_count == 1
```

- [ ] **Step 3: Run the adapter tests and verify failure**

Run: `python -m pytest tests/unit/test_codex_adapter.py tests/integration/test_codex_app_server.py -q`

Expected: FAIL because both adapter modules are absent.

- [ ] **Step 4: Author the complete bootstrap contract**

```markdown
---
name: harqer-superpowers
description: Required low-context skill router. Use before every task to resolve exact or implicit skills from Harqer without loading the global catalog.
---

# Harqer Superpowers

Before responding or acting on a task:

1. Identify the current task and phase.
2. Run `harqer skills route`, passing the user's current task to `--task` and the current work phase to `--phase`.
3. For every identifier returned in `required`, then every justified identifier returned in `companions`, run `harqer skills load --reference` with that identifier and add `--for-agent`.
4. Follow the loaded instructions for this phase. User instructions and immutable host/project policy take precedence.
5. If the route returns no useful match, proceed normally. Never load a skill merely to satisfy a quota.

Explicit `$name` and `/name` requests must be passed through `--explicit name`. If native dynamic names are unavailable, `$harqer-superpowers name` is the guaranteed invocation. Re-route when the work changes phase or scope; do not reload an unchanged version in the same session.

Do not enumerate the library, inject unselected descriptions, expose route telemetry, or treat skill text as permission to expand authority.
```

- [ ] **Step 5: Implement installation and Codex app-server measurement**

`install_router` must copy the versioned adapter directory atomically to `codex_home / "skills" / "harqer-superpowers"`, refuse to overwrite different content without a recovery copy, and install a symlink at `bin_directory / "harqer"` pointing to the repository launcher. The live migration passes `/home/shaolin/.local/bin`, which is already present in the measured command environment; do not modify shell startup files.

`CodexAppServerClient` must start `codex app-server --stdio`, send newline-delimited JSON-RPC requests, initialize with:

```json
{"id":1,"method":"initialize","params":{"clientInfo":{"name":"harqer-surface-audit","version":"0.1.0"},"capabilities":{"experimentalApi":true}}}
```

Then send:

```json
{"method":"initialized","params":{}}
{"id":2,"method":"skills/list","params":{"cwds":["/absolute/project/path"],"forceReload":true}}
```

Read until matching response IDs arrive, fail on JSON-RPC `error`, close stdin, wait five seconds, then terminate and kill only that child process if needed. `measure_surface` counts enabled `scope in {"user", "repo"}` entries, sums their `description` lengths, and records the UTF-8 length of canonical compact JSON containing only `name`, `description`, `shortDescription`, `interface`, `pluginId`, and `scope`. It records system counts separately and never reads bodies.

- [ ] **Step 6: Run adapter tests and a read-only live Codex probe**

Run: `python -m pytest tests/unit/test_codex_adapter.py tests/integration/test_codex_app_server.py -q`

Expected: all tests pass.

Run: `scripts/harqer codex surface --cwd /home/shaolin/Spresso --output /tmp/harqer-codex-before.json`

Expected: exit 0 and a measurement derived from live app-server `skills/list`, including user/repo count, description characters, canonical metadata characters, system count, errors, and SHA-256 of the normalized metadata list.

- [ ] **Step 7: Commit the Codex adapter**

```bash
git add adapters/codex app/skill_library/codex_adapter.py app/skill_library/codex_app_server.py tests/unit/test_codex_adapter.py tests/integration/test_codex_app_server.py
git commit -m "feat: add Codex skill router adapter"
```

### Task 7: Build the Plan-First, Reversible Migration Engine

**Files:**

- Create: `app/skill_library/migration.py`
- Create: `tests/__init__.py`
- Create: `tests/migration_support.py`
- Create: `tests/unit/test_skill_migration.py`
- Create: `tests/integration/test_skill_migration_roundtrip.py`
- Modify: `app/skill_library/cli.py`
- Modify: `app/skill_library/codex_adapter.py`

**Interfaces:**

- Consumes: verified inventory/import reports, plugin capability reports, and a Codex surface baseline.
- Produces: `MigrationService.plan(request: MigrationRequest) -> MigrationPlan`, `MigrationService.apply(plan_path: Path, confirmation_sha256: str) -> MigrationResult`, `MigrationService.verify(migration_id: str) -> MigrationVerification`, `MigrationService.rollback(migration_id: str) -> MigrationResult`, and `MigrationService.rehearse(request: MigrationRequest) -> MigrationRehearsal`.

- [ ] **Step 1: Write the round-trip test before migration code**

Create `tests/migration_support.py` with a `MigrationFixture` dataclass and `build_migration_fixture(tmp_path: Path, router_passed: bool = True) -> MigrationFixture`. The builder must create real temporary Codex/Agents/project skill directories, a protected `.system/imagegen` skill, a byte-identical project copy, a skill-only Superpowers plugin manifest, a Claude Mem manifest with `skills`, `hooks`, and `mcpServers`, and this exact config:

```toml
[plugins."superpowers@test"]
enabled = true

[plugins."claude-mem@test"]
enabled = true

[features]
hooks = true
```

The builder runs `InventoryScanner`, imports into a temporary `SkillLibrary`, writes its `InventoryReport` and `ImportReport` as JSON, runs the Task 4 exact and implicit smoke routes, and writes `{"passed": true, "exact": true, "implicit": true}` or the same object with `passed` false to `router-verification.json`. It exposes these typed fields so both test files share one real fixture:

```python
from dataclasses import dataclass
from pathlib import Path

from app.skill_library.models import SkillSource


@dataclass(frozen=True)
class MigrationFixture:
    repo_root: Path
    state_root: Path
    codex_home: Path
    codex_config: Path
    original_config: bytes
    agents_skills: Path
    codex_skills: Path
    project_skills: Path
    sources: tuple[SkillSource, ...]
    inventory_path: Path
    import_report_path: Path
    router_verification_path: Path
    plugin_roots: dict[str, Path]

    def request(self):
        from app.skill_library.migration import MigrationRequest

        return MigrationRequest(
            codex_home=self.codex_home,
            bin_directory=self.codex_home.parent / ".local" / "bin",
            sources=self.sources,
            project_roots=(self.project_skills,),
            inventory_path=self.inventory_path,
            import_report_path=self.import_report_path,
            router_verification_path=self.router_verification_path,
            plugin_roots=self.plugin_roots,
            disable_plugins=("superpowers@test",),
            retain_plugins=("claude-mem@test",),
            duplicate_project_copies_only=True,
        )


def _write_skill(root: Path, name: str, description: str, body: str) -> Path:
    directory = root / name
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "SKILL.md").write_text(
        f"---\nname: {name}\ndescription: {description}\n---\n{body}\n",
        encoding="utf-8",
    )
    return directory


def _write_plugin(root: Path, manifest: dict) -> None:
    manifest_directory = root / ".codex-plugin"
    manifest_directory.mkdir(parents=True)
    (manifest_directory / "plugin.json").write_text(
        json.dumps(manifest, sort_keys=True),
        encoding="utf-8",
    )


def build_migration_fixture(tmp_path: Path, router_passed: bool = True) -> MigrationFixture:
    repo_root = Path(__file__).resolve().parents[1]
    state_root = tmp_path / ".harqer"
    codex_home = tmp_path / ".codex"
    codex_skills = codex_home / "skills"
    agents_skills = tmp_path / ".agents" / "skills"
    project_skills = tmp_path / "project" / ".agents" / "skills"
    debugging_text = ("Debug failures systematically", "# Debugging\nObserve before editing.")
    _write_skill(agents_skills, "debugging", *debugging_text)
    _write_skill(project_skills, "debugging", *debugging_text)
    _write_skill(codex_skills, "planning", "Write implementation plans", "# Planning")
    _write_skill(codex_skills / ".system", "imagegen", "Codex-owned image generation", "# Imagegen")

    superpowers_root = tmp_path / "plugins" / "superpowers"
    memory_root = tmp_path / "plugins" / "claude-mem"
    _write_skill(superpowers_root / "skills", "using-superpowers", "Check skills before every task", "# Superpowers")
    _write_skill(memory_root / "skills", "mem-search", "Search persistent memory", "# Memory")
    _write_plugin(
        superpowers_root,
        {"name": "superpowers", "version": "1.0.0", "skills": "./skills/", "hooks": {}},
    )
    _write_plugin(
        memory_root,
        {
            "name": "claude-mem",
            "version": "1.0.0",
            "skills": "./skills/",
            "hooks": "./hooks.json",
            "mcpServers": "./.mcp.json",
        },
    )

    codex_home.mkdir(exist_ok=True)
    codex_config = codex_home / "config.toml"
    original_config = (
        '[plugins."superpowers@test"]\nenabled = true\n\n'
        '[plugins."claude-mem@test"]\nenabled = true\n\n'
        "[features]\nhooks = true\n"
    ).encode("utf-8")
    codex_config.write_bytes(original_config)

    sources = (
        SkillSource(namespace="agents", root=agents_skills, kind=SkillSourceKind.AGENTS_USER),
        SkillSource(namespace="codex", root=codex_skills, kind=SkillSourceKind.CODEX_USER),
        SkillSource(namespace="spresso", root=project_skills, kind=SkillSourceKind.REPOSITORY),
        SkillSource(
            namespace="superpowers",
            root=superpowers_root / "skills",
            kind=SkillSourceKind.PLUGIN,
            plugin_id="superpowers@test",
        ),
        SkillSource(
            namespace="claude-mem",
            root=memory_root / "skills",
            kind=SkillSourceKind.PLUGIN,
            plugin_id="claude-mem@test",
        ),
    )
    policy = RoutingPolicy(process_skills=frozenset({"using-superpowers", "planning"}))
    inventory = InventoryScanner(policy).scan(sources)
    library = SkillLibrary.create(state_root)
    imported = library.import_inventory(inventory)
    library.activate(tuple(version.id for version in imported.versions))
    explicit_ok = library.load("debugging").body.startswith("---")
    implicit_ok = bool(SkillRouter(library.registry, policy).route("debug the failing code").required)

    inventory_path = tmp_path / "inventory.json"
    import_report_path = tmp_path / "import-report.json"
    router_verification_path = tmp_path / "router-verification.json"
    inventory_path.write_text(inventory.model_dump_json(indent=2), encoding="utf-8")
    import_report_path.write_text(imported.model_dump_json(indent=2), encoding="utf-8")
    router_verification_path.write_text(
        json.dumps(
            {"passed": router_passed and explicit_ok and implicit_ok, "exact": explicit_ok, "implicit": implicit_ok},
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    return MigrationFixture(
        repo_root=repo_root,
        state_root=state_root,
        codex_home=codex_home,
        codex_config=codex_config,
        original_config=original_config,
        agents_skills=agents_skills,
        codex_skills=codex_skills,
        project_skills=project_skills,
        sources=sources,
        inventory_path=inventory_path,
        import_report_path=import_report_path,
        router_verification_path=router_verification_path,
        plugin_roots={"superpowers@test": superpowers_root, "claude-mem@test": memory_root},
    )
```

At the top of the helper file import `json`, `InventoryScanner`, `SkillLibrary`, `SkillSource`, `SkillSourceKind`, `SkillRouter`, and `RoutingPolicy` from their Task 1-4 modules. Import `MigrationRequest` inside `request()` to avoid an import cycle. All generated paths stay under pytest's `tmp_path`.

```python
# tests/integration/test_skill_migration_roundtrip.py
from pathlib import Path

from app.skill_library.hashing import hash_skill_tree
from app.skill_library.migration import MigrationService
from tests.migration_support import build_migration_fixture


def test_apply_and_rollback_restore_byte_identical_discovery_state(tmp_path: Path) -> None:
    fixture = build_migration_fixture(tmp_path)
    before = {path.name: hash_skill_tree(path) for path in fixture.agents_skills.iterdir() if path.is_dir()}
    service = MigrationService(fixture.state_root, fixture.repo_root)
    plan = service.plan(fixture.request())
    result = service.apply(plan.path, plan.sha256)

    assert result.state == "applied"
    assert (fixture.codex_home / "skills" / "harqer-superpowers" / "SKILL.md").is_file()
    assert not (fixture.agents_skills / "debugging").exists()
    assert (fixture.codex_home / "skills" / ".system" / "imagegen" / "SKILL.md").is_file()

    rolled_back = service.rollback(plan.migration_id)
    after = {path.name: hash_skill_tree(path) for path in fixture.agents_skills.iterdir() if path.is_dir()}
    assert rolled_back.state == "rolled_back"
    assert after == before
    assert fixture.codex_config.read_bytes() == fixture.original_config
```

- [ ] **Step 2: Write refusal tests for every destructive precondition**

```python
# tests/unit/test_skill_migration.py
from pathlib import Path

import pytest

from app.skill_library.migration import MigrationService, MigrationVerificationError
from tests.migration_support import build_migration_fixture


def test_apply_refuses_wrong_confirmation(tmp_path: Path) -> None:
    fixture = build_migration_fixture(tmp_path)
    service = MigrationService(fixture.state_root, fixture.repo_root)
    migration_plan = service.plan(fixture.request())
    with pytest.raises(MigrationVerificationError, match="confirmation hash"):
        service.apply(migration_plan.path, "0" * 64)


def test_apply_refuses_changed_source_after_plan(tmp_path: Path) -> None:
    fixture = build_migration_fixture(tmp_path)
    service = MigrationService(fixture.state_root, fixture.repo_root)
    migration_plan = service.plan(fixture.request())
    fixture.agents_skills.joinpath("debugging", "SKILL.md").write_text("changed after plan", encoding="utf-8")
    with pytest.raises(MigrationVerificationError, match="source hash changed"):
        service.apply(migration_plan.path, migration_plan.sha256)


def test_apply_refuses_unverified_router(tmp_path: Path) -> None:
    fixture = build_migration_fixture(tmp_path, router_passed=False)
    service = MigrationService(fixture.state_root, fixture.repo_root)
    migration_plan = service.plan(fixture.request())
    with pytest.raises(MigrationVerificationError, match="router verification"):
        service.apply(migration_plan.path, migration_plan.sha256)


def test_apply_retains_plugin_with_non_skill_capabilities(tmp_path: Path) -> None:
    fixture = build_migration_fixture(tmp_path)
    service = MigrationService(fixture.state_root, fixture.repo_root)
    migration_plan = service.plan(fixture.request())
    assert "claude-mem@test" in migration_plan.retained_plugins
    assert "claude-mem@test" not in migration_plan.plugin_mutations


def test_rehearsal_never_mutates_live_sources(tmp_path: Path) -> None:
    fixture = build_migration_fixture(tmp_path)
    before_config = fixture.codex_config.read_bytes()
    before_tree = hash_skill_tree(fixture.agents_skills / "debugging")
    service = MigrationService(fixture.state_root, fixture.repo_root)

    rehearsal = service.rehearse(fixture.request())

    assert rehearsal.passed is True
    assert rehearsal.rollback_verified is True
    assert fixture.codex_config.read_bytes() == before_config
    assert hash_skill_tree(fixture.agents_skills / "debugging") == before_tree
```

- [ ] **Step 3: Run migration tests and verify failure**

Run: `python -m pytest tests/unit/test_skill_migration.py tests/integration/test_skill_migration_roundtrip.py -q`

Expected: FAIL because `MigrationService` is absent.

- [ ] **Step 4: Implement journaled plan and verification contracts**

Add these models to `models.py` or `migration.py`:

```python
class MigrationRequest(BaseModel):
    codex_home: Path
    bin_directory: Path
    sources: tuple[SkillSource, ...]
    project_roots: tuple[Path, ...] = ()
    inventory_path: Path
    import_report_path: Path
    router_verification_path: Path
    plugin_roots: dict[str, Path] = Field(default_factory=dict)
    disable_plugins: tuple[str, ...] = ()
    retain_plugins: tuple[str, ...] = ()
    duplicate_project_copies_only: bool = True


class MigrationAction(BaseModel):
    action: Literal["archive_skill", "install_router", "disable_plugin", "retain_plugin"]
    source: Path | None = None
    destination: Path | None = None
    plugin_id: str | None = None
    expected_sha256: str | None = None
    reason: str


class MigrationPlan(BaseModel):
    schema_version: Literal[1] = 1
    migration_id: str
    created_at: str
    state: Literal["planned"] = "planned"
    codex_config_sha256: str
    inventory_sha256: str
    import_report_sha256: str
    router_verification_sha256: str
    actions: tuple[MigrationAction, ...]
    retained_plugins: tuple[str, ...]
    plugin_mutations: tuple[str, ...]
    path: Path = Field(exclude=True)
    sha256: str = Field(exclude=True)


class MigrationResult(BaseModel):
    migration_id: str
    state: Literal["applied", "rolled_back"]
    completed_actions: tuple[MigrationAction, ...]
    journal_path: Path


class MigrationVerification(BaseModel):
    migration_id: str
    state: str
    source_hashes_match: bool
    archive_hashes_match: bool
    config_hash_matches: bool
    router_installed: bool
    system_root_unchanged: bool
    passed: bool


class MigrationRehearsal(BaseModel):
    rehearsal_root: Path
    plan_sha256: str
    apply_verified: bool
    rollback_verified: bool
    source_hashes_unchanged: bool
    passed: bool
```

Store each bundle at `state_root / "backups" / migration_id` with `plan.json`, `journal.jsonl`, `inventory.json`, `import-report.json`, `router-verification.json`, `config/original.toml`, `originals/`, and `relocated/`. Every journal record contains a monotonic sequence, timestamp, action, target, before hash, after hash, and result.

Compute `MigrationPlan.sha256` from canonical UTF-8 JSON with sorted keys and compact separators after excluding the runtime-only `path` and `sha256` fields. Write those exact canonical bytes to `plan.json`; `apply` hashes the bytes it reads rather than trusting the caller's model object.

- [ ] **Step 5: Implement apply and rollback ordering**

`apply` must acquire `state_root / "migration.lock"` with `fcntl.flock(LOCK_EX | LOCK_NB)`, verify the confirmation/plan/source/config hashes, verify every document is imported, activate the migration set, smoke exact and implicit routes, copy all originals and verify copies, install the router, mutate only planned skill-only plugins, then atomically relocate only unprotected source directories. Project directories relocate only when their tree hash already exists in the imported global set. On the first error, stop, record `failed`, run rollback over completed actions in reverse, and surface the original typed exception.

`rollback` must refuse a target collision unless the current target hash matches either the post-apply hash or the original hash. Restore config bytes exactly, restore directories from `originals/`, remove only the matching installed router version, rebuild the registry, and leave the recovery bundle intact.

- [ ] **Step 6: Add migration CLI commands with dry-run as the default**

The command surface is:

```text
harqer skills migrate plan --state-root PATH --codex-home PATH --source NAMESPACE:KIND:PATH --project-root PATH
harqer skills migrate rehearse --state-root PATH --codex-home PATH --source NAMESPACE:KIND:PATH --project-root PATH
harqer skills migrate apply --state-root PATH --plan PATH --confirm PLAN_SHA256
harqer skills migrate verify --state-root PATH --migration-id ID
harqer skills migrate rollback --state-root PATH --migration-id ID
```

`plan` performs no discovery/config mutation. `rehearse` copies discovery/config targets into a directory created with `tempfile.mkdtemp(prefix="harqer-migration-rehearsal.")`, rewrites the plan targets to those copies, performs apply/verify/rollback there, compares original hashes, leaves the rehearsal evidence under the state root, and never mutates the supplied sources. There is no implicit `--yes`; `apply` requires the exact printed plan SHA-256.

- [ ] **Step 7: Run migration tests twice to prove idempotence**

Run: `python -m pytest tests/unit/test_skill_migration.py tests/integration/test_skill_migration_roundtrip.py -q`

Expected: all tests pass.

Run: `python -m pytest tests/integration/test_skill_migration_roundtrip.py -q`

Expected: a second clean round trip with no residue from the first run; do not add a repetition plugin for this check.

- [ ] **Step 8: Commit the migration engine**

```bash
git add app/skill_library/migration.py app/skill_library/models.py app/skill_library/cli.py app/skill_library/codex_adapter.py tests/unit/test_skill_migration.py tests/integration/test_skill_migration_roundtrip.py
git commit -m "feat: add reversible global skill migration"
```

### Task 8: Add Authenticated Model-Agnostic Skill Route and Load APIs

**Files:**

- Create: `app/skill_routes.py`
- Create: `tests/unit/test_skill_api_contract.py`
- Modify: `app/config.py:30-67`
- Modify: `app/schemas.py:3-97`
- Modify: `app/main.py:5-83`
- Modify: `.env.example`
- Modify: `tests/test_live_integration.py`

**Interfaces:**

- Consumes: `SkillLibrary`, `SkillRouter`, and the unchanged production `require_api_key` dependency.
- Produces: `POST /v1/skills/route`, `POST /v1/skills/load`, and `POST /v1/skills/read-text`; all are authenticated and provider-neutral.

- [ ] **Step 1: Define and test bounded API contracts**

```python
# tests/unit/test_skill_api_contract.py
import pytest
from pydantic import ValidationError

from app.schemas import SkillLoadRequest, SkillReadTextRequest, SkillRouteRequest


def test_route_request_is_bounded() -> None:
    request = SkillRouteRequest(task="debug the failing test", phase="pre-edit", explicit=["systematic-debugging"])
    assert request.task == "debug the failing test"
    with pytest.raises(ValidationError):
        SkillRouteRequest(task="x" * 12001)
    with pytest.raises(ValidationError):
        SkillRouteRequest(task="valid", explicit=["a", "b", "c", "d", "e"])


def test_load_reference_rejects_paths() -> None:
    with pytest.raises(ValidationError):
        SkillLoadRequest(reference="../../etc/passwd")


def test_read_text_rejects_parent_traversal() -> None:
    with pytest.raises(ValidationError):
        SkillReadTextRequest(reference="debugging", relative_path="../../secret.txt")
```

The schemas are exact:

```python
SkillReference = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$")]


class SkillRouteRequest(BaseModel):
    task: str = Field(min_length=1, max_length=12_000)
    phase: str = Field(default="start", min_length=1, max_length=64)
    explicit: list[SkillReference] = Field(default_factory=list, max_length=4)
    constraints: list[str] = Field(default_factory=list, max_length=8)


class SkillRouteResponse(RouteDecision):
    pass


class SkillLoadRequest(BaseModel):
    reference: SkillReference


class SkillLoadResponse(BaseModel):
    skill: SkillVersion
    body: str = Field(max_length=1_000_000)
    reference_files: tuple[str, ...]


class SkillReadTextRequest(BaseModel):
    reference: SkillReference
    relative_path: str = Field(min_length=1, max_length=512)

    @field_validator("relative_path")
    @classmethod
    def validate_relative_path(cls, value: str) -> str:
        path = PurePosixPath(value)
        if path.is_absolute() or ".." in path.parts:
            raise ValueError("relative_path must stay inside the selected skill")
        return value


class SkillReadTextResponse(BaseModel):
    reference: SkillReference
    relative_path: str
    content: str = Field(max_length=1_000_000)
```

- [ ] **Step 2: Run contract tests and verify failure**

Run: `python -m pytest tests/unit/test_skill_api_contract.py -q`

Expected: FAIL because the new request types are absent.

- [ ] **Step 3: Configure the server-owned state root**

Add `HARQER_STATE_ROOT` to `.env.example`. In `Settings`, define `HARQER_STATE_ROOT: Path = Path(os.environ.get("HARQER_STATE_ROOT", "/var/lib/harqer"))`; the local CLI continues to default to `~/.harqer`. Do not accept a state root from an HTTP request.

- [ ] **Step 4: Implement the authenticated router without auth bypasses**

```python
# app/skill_routes.py
from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_api_key
from app.config import settings
from app.schemas import (
    SkillLoadRequest,
    SkillLoadResponse,
    SkillReadTextRequest,
    SkillReadTextResponse,
    SkillRouteRequest,
    SkillRouteResponse,
)
from app.skill_library.library import SkillLibrary
from app.skill_library.routing import SkillRouter
from app.skill_library.routing_policy import RoutingPolicy

router = APIRouter(prefix="/v1/skills", tags=["skills"])


def get_skill_library() -> SkillLibrary:
    return SkillLibrary.create(settings.HARQER_STATE_ROOT)


@router.post("/route", response_model=SkillRouteResponse)
async def route_skill(
    request: SkillRouteRequest,
    key_row: dict = Depends(require_api_key),
    library: SkillLibrary = Depends(get_skill_library),
) -> SkillRouteResponse:
    del key_row
    try:
        decision = SkillRouter(library.registry, RoutingPolicy.default()).route(
            request.task,
            request.phase,
            tuple(request.explicit),
            tuple(request.constraints),
        )
    except LookupError as error:
        raise HTTPException(status_code=404, detail="An explicitly requested skill was not found or is ambiguous.") from error
    return SkillRouteResponse(**decision.model_dump())


@router.post("/load", response_model=SkillLoadResponse)
async def load_skill(
    request: SkillLoadRequest,
    key_row: dict = Depends(require_api_key),
    library: SkillLibrary = Depends(get_skill_library),
) -> SkillLoadResponse:
    del key_row
    try:
        loaded = library.load(request.reference)
    except LookupError as error:
        raise HTTPException(status_code=404, detail="Skill reference was not found or is ambiguous.") from error
    return SkillLoadResponse(
        skill=loaded.skill,
        body=loaded.body,
        reference_files=tuple(str(path.relative_to(loaded.skill.library_path)) for path in loaded.reference_files),
    )


@router.post("/read-text", response_model=SkillReadTextResponse)
async def read_skill_text(
    request: SkillReadTextRequest,
    key_row: dict = Depends(require_api_key),
    library: SkillLibrary = Depends(get_skill_library),
) -> SkillReadTextResponse:
    del key_row
    try:
        content = library.read_text(request.reference, request.relative_path)
    except (LookupError, ValueError, UnicodeDecodeError) as error:
        raise HTTPException(status_code=404, detail="The requested skill text file is unavailable.") from error
    return SkillReadTextResponse(
        reference=request.reference,
        relative_path=request.relative_path,
        content=content,
    )
```

Mount with `app.include_router(skill_routes.router)`. Pydantic validation remains HTTP 422; missing or ambiguous explicit references are HTTP 404 as shown; a registry-unavailable `sqlite3.OperationalError` is logged server-side and mapped to HTTP 503 with `"Skill registry is temporarily unavailable."`. No response includes a filesystem path, SQL text, traceback, or raw exception string.

- [ ] **Step 5: Extend the real live integration script**

Keep the existing real authentication path. Add calls to `/v1/skills/route` and `/v1/skills/load` using `HARQER_API_KEY`, assert a known migrated alias resolves, and verify the returned body hash against the local manifest when `HARQER_STATE_ROOT` is available. Do not monkeypatch `require_api_key`, Supabase, or FastAPI dependencies.

- [ ] **Step 6: Run offline checks, then the credentialed live check when configured**

Run: `python -m pytest tests/unit/test_skill_api_contract.py tests/unit/test_skill_routing.py -q`

Expected: all tests pass.

Run: `python -m compileall -q app scripts tests`

Expected: exit code 0.

Run only with real local credentials and a running server: `python tests/test_live_integration.py`

Expected: authenticated completion plus skill route/load checks pass. If required credentials are absent, record the live test as not run; do not replace it with a fake service.

- [ ] **Step 7: Commit the API contract**

```bash
git add .env.example app/config.py app/main.py app/schemas.py app/skill_routes.py tests/unit/test_skill_api_contract.py tests/test_live_integration.py
git commit -m "feat: expose authenticated skill routing API"
```

### Task 9: Add a Versioned Routing Evaluation and Promotion Gate

**Files:**

- Create: `app/skill_library/evaluation.py`
- Create: `evals/routing/v1.yaml`
- Create: `tests/routing_eval_support.py`
- Create: `tests/unit/test_routing_evaluation.py`
- Modify: `app/skill_library/cli.py`

**Interfaces:**

- Consumes: an active imported library, `SkillRouter`, and the v1 YAML cases.
- Produces: `evaluate_routes(router: SkillRouter, suite: RoutingSuite, repetitions: int = 100) -> RoutingEvaluation` and `harqer eval routing`.

- [ ] **Step 1: Create the full initial golden set**

```yaml
schema_version: 1
cases:
  - {id: exact-ponytail, task: "Apply $ponytail", explicit: [ponytail], expect: [ponytail], forbidden: []}
  - {id: exact-caveman, task: "Use /caveman", explicit: [caveman], expect: [caveman], forbidden: []}
  - {id: exact-superpowers, task: "Use the Superpowers entrypoint", explicit: [superpowers:using-superpowers], expect: [using-superpowers], forbidden: []}
  - {id: design-first, task: "I have an idea for a feature; help shape the design before code", phase: start, expect: [brainstorming], forbidden: [executing-plans]}
  - {id: write-plan, task: "The specification is approved; produce the implementation plan", phase: planning, expect: [writing-plans], forbidden: [brainstorming]}
  - {id: execute-plan, task: "Implement the approved plan task by task", phase: implementation, expect: [executing-plans], forbidden: []}
  - {id: red-green, task: "Develop this behavior test first with red green refactor", phase: pre-edit, expect: [test-driven-development], forbidden: []}
  - {id: debug-evidence, task: "The test is flaky; diagnose the root cause before changing code", phase: diagnosis, expect: [systematic-debugging], forbidden: []}
  - {id: verify-completion, task: "Verify the implementation before claiming it is complete", phase: verification, expect: [verification-before-completion], forbidden: []}
  - {id: code-review, task: "Request an independent review of the finished implementation", phase: review, expect: [requesting-code-review], forbidden: []}
  - {id: skill-authoring, task: "Write a reusable Codex skill for this workflow", phase: implementation, expect: [writing-skills], forbidden: []}
  - {id: worktree, task: "Create an isolated git worktree before implementation", phase: setup, expect: [using-git-worktrees], forbidden: []}
  - {id: dat-camera, task: "Modify com.meta.wearable camera streaming and device session lifecycle", phase: pre-edit, expect: [camera-streaming], companions: [permissions-registration, session-lifecycle], forbidden: []}
  - {id: dat-display, task: "Render content on Meta glasses using the DAT Display DSL", phase: pre-edit, expect: [display-access], companions: [permissions-registration, session-lifecycle], forbidden: [jetpack-compose-m3]}
  - {id: genkit-flow, task: "Change a Genkit flow under functions/src/ai", phase: pre-edit, expect: [developing-genkit-js], forbidden: [gemini-api-dev]}
  - {id: gemini-direct, task: "Call Gemini directly with @google/genai generateContent", phase: pre-edit, expect: [gemini-api-dev], forbidden: [developing-genkit-js]}
  - {id: gemini-interactions, task: "Implement client.interactions with the Gemini Interactions API", phase: pre-edit, expect: [gemini-interactions-api], forbidden: [gemini-live-api-dev]}
  - {id: gemini-live, task: "Create an ephemeral token for bidirectional Gemini Live audio", phase: pre-edit, expect: [gemini-live-api-dev], forbidden: [gemini-interactions-api]}
  - {id: android-navigation, task: "Migrate this Android app to Navigation 3", phase: pre-edit, expect: [navigation-3], forbidden: []}
  - {id: durable-object, task: "Implement a Cloudflare Durable Object with storage", phase: pre-edit, expect: [durable-objects], forbidden: []}
  - {id: security-scan, task: "Run a deep security scan and track findings", phase: review, expect: [deep-security-scan], forbidden: []}
  - {id: irrelevant-poem, task: "Write a four-line poem about rain on glass", phase: start, expect: [], forbidden: [brainstorming, writing-plans]}
```

- [ ] **Step 2: Write evaluator tests**

Create `tests/routing_eval_support.py` with `build_evaluation_router(repo_root: Path, tmp_path: Path) -> SkillRouter`. It reads the v1 YAML, creates one real temporary skill for every distinct name in `expect`, `companions`, and `forbidden`, and uses all tasks that expect that name as its description. Add the known Superpowers process names to `RoutingPolicy.process_skills`, map `superpowers:using-superpowers` to `using-superpowers`, declare the camera/display companions against the fixture namespace, inventory/import/activate the trees, and return a real `SkillRouter`. This keeps the evaluator offline without replacing the router or registry with test doubles.

```python
# tests/routing_eval_support.py
from pathlib import Path

import yaml

from app.skill_library.inventory import InventoryScanner
from app.skill_library.library import SkillLibrary
from app.skill_library.models import SkillSource, SkillSourceKind
from app.skill_library.routing import SkillRouter
from app.skill_library.routing_policy import RoutingPolicy

PROCESS_SKILLS = frozenset(
    {
        "brainstorming",
        "executing-plans",
        "requesting-code-review",
        "systematic-debugging",
        "test-driven-development",
        "using-git-worktrees",
        "using-superpowers",
        "verification-before-completion",
        "writing-plans",
        "writing-skills",
    }
)


def build_evaluation_router(repo_root: Path, tmp_path: Path) -> SkillRouter:
    suite_path = repo_root / "evals" / "routing" / "v1.yaml"
    payload = yaml.safe_load(suite_path.read_text(encoding="utf-8"))
    descriptions: dict[str, list[str]] = {}
    for case in payload["cases"]:
        for name in (*case.get("expect", []), *case.get("companions", [])):
            descriptions.setdefault(name, []).append(case["task"])
        for name in case.get("forbidden", []):
            descriptions.setdefault(name, [name.replace("-", " ")])

    root = tmp_path / "evaluation-skills"
    for name, task_texts in descriptions.items():
        directory = root / name
        directory.mkdir(parents=True)
        description = " | ".join(dict.fromkeys(task_texts))
        (directory / "SKILL.md").write_text(
            f"---\nname: {name}\ndescription: {description}\n---\n# {name}\n",
            encoding="utf-8",
        )

    policy = RoutingPolicy(
        process_skills=PROCESS_SKILLS,
        aliases={"superpowers:using-superpowers": "using-superpowers"},
        companions={
            "fixture:camera-streaming": ("permissions-registration", "session-lifecycle"),
            "fixture:display-access": ("permissions-registration", "session-lifecycle"),
        },
        high_risk_phrases={
            "com.meta.wearable": "camera-streaming",
            "dat display dsl": "display-access",
            "functions/src/ai": "developing-genkit-js",
            "client.interactions": "gemini-interactions-api",
            "ephemeral token": "gemini-live-api-dev",
        },
    )
    source = SkillSource(namespace="fixture", root=root, kind=SkillSourceKind.REPOSITORY)
    inventory = InventoryScanner(policy).scan((source,))
    library = SkillLibrary.create(tmp_path / "state")
    imported = library.import_inventory(inventory)
    library.activate(tuple(version.id for version in imported.versions))
    return SkillRouter(library.registry, policy)
```

```python
# tests/unit/test_routing_evaluation.py
from pathlib import Path

from app.skill_library.evaluation import evaluate_routes, load_suite
from tests.routing_eval_support import build_evaluation_router


def test_evaluator_reports_recall_limits_latency_and_zero_router_tokens(tmp_path: Path) -> None:
    repo_root = Path(__file__).resolve().parents[2]
    router = build_evaluation_router(repo_root, tmp_path)
    suite = load_suite(repo_root / "evals" / "routing" / "v1.yaml")
    result = evaluate_routes(router, suite, repetitions=3)
    assert result.exact_recall == 1.0
    assert result.high_risk_gate_recall == 1.0
    assert result.average_primary_bodies <= 2.0
    assert result.router_model_tokens == 0
    assert result.failures == ()
```

- [ ] **Step 3: Run and verify the evaluator is missing**

Run: `python -m pytest tests/unit/test_routing_evaluation.py -q`

Expected: FAIL because `evaluation.py` does not exist.

- [ ] **Step 4: Implement metrics and non-zero failure exit**

`RoutingEvaluation` records suite SHA-256, library manifest SHA-256, case count, exact recall, overall required recall, forbidden-load count, high-risk-gate recall, average primary bodies, average companion bodies, p50/p95 latency, router model tokens, failures, and timestamp. Normalize comparisons through registry aliases so namespace selection does not make a correct route fail.

`harqer eval routing` exits 4 unless all gates pass:

```python
exact_recall == 1.0
high_risk_gate_recall == 1.0
overall_required_recall >= 0.90
forbidden_load_count == 0
average_primary_bodies <= 2.0
p95_latency_ms <= 50.0
router_model_tokens == 0
```

Write JSON evidence under `state_root / "evals" / "routing" / (timestamp + "-" + suite_hash + ".json")`; do not rewrite the suite.

- [ ] **Step 5: Run the golden suite against a temporary import**

Run: `python -m pytest tests/unit/test_routing_evaluation.py tests/unit/test_skill_routing.py -q`

Expected: all tests pass.

- [ ] **Step 6: Commit the evaluation gate**

```bash
git add app/skill_library/evaluation.py app/skill_library/cli.py evals/routing/v1.yaml tests/unit/test_routing_evaluation.py
git commit -m "test: gate skill routing with golden evaluation"
```

### Task 10: Correct Compatibility Claims and Document Operations

**Files:**

- Modify: `app/main.py:16-23`
- Modify: `app/rlm_service.py:1-17,172-199`
- Create: `app/usage_comparison.py`
- Create: `app/skill_library/evidence.py`
- Modify: `app/schemas.py:81-88`
- Modify: `README.md:1-107,171-181`
- Modify: `tests/test_live_integration.py`
- Create: `docs/global-skill-migration.md`
- Create: `tests/unit/test_usage_comparison.py`
- Create: `tests/unit/test_cutover_evidence.py`

**Interfaces:**

- Consumes: existing `/v1/completions` response and migration CLI.
- Produces: backward-compatible additive `SavingsOut.comparable: bool` and `SavingsOut.comparison_basis: str`, a direct-vs-RLM live script, `write_cutover_report(inputs: CutoverEvidenceInputs, output: Path) -> Path`, and an exact operator runbook.

- [ ] **Step 1: Add a test proving the old calculation is labeled directional**

```python
# tests/unit/test_usage_comparison.py
from app.usage_comparison import build_usage_comparison


def test_usage_comparison_does_not_claim_controlled_savings() -> None:
    comparison = build_usage_comparison(mode="rlm", estimated_direct_input=1000, observed_total=400)
    assert comparison["tokens_saved"] == 600
    assert comparison["comparable"] is False
    assert comparison["comparison_basis"] == "estimated_direct_input_vs_observed_input_plus_output"
```

- [ ] **Step 2: Run the test and verify failure**

Run: `python -m pytest tests/unit/test_usage_comparison.py -q`

Expected: FAIL because `build_usage_comparison` does not exist.

- [ ] **Step 3: Extract and relabel the compatibility calculation**

Keep all existing `savings` fields so v0.1 clients continue to parse the response. Add `comparable: Literal[False] = False` and `comparison_basis: Literal["estimated_direct_input_vs_observed_input_plus_output"]`. Rename prose and docstrings from “real token savings” to “directional token comparison.” Do not use this field in benchmark claims; Task 9 routing uses zero model tokens by construction, while controlled direct/RLM comparisons belong to Milestone 2.

```python
# app/usage_comparison.py
from __future__ import annotations

from typing import Literal


def build_usage_comparison(
    mode: Literal["direct", "rlm"],
    estimated_direct_input: int,
    observed_total: int,
) -> dict[str, int | float | bool | str]:
    delta = estimated_direct_input - observed_total
    percentage = (delta / estimated_direct_input * 100.0) if estimated_direct_input else 0.0
    return {
        "mode_used": mode,
        "estimated_naive_tokens": estimated_direct_input,
        "actual_total_tokens": observed_total,
        "tokens_saved": delta,
        "pct_saved": round(percentage, 2),
        "comparable": False,
        "comparison_basis": "estimated_direct_input_vs_observed_input_plus_output",
    }
```

Call this function from `run_completion` instead of constructing the dictionary inline.

- [ ] **Step 4: Make the live completion script force both paths**

Refactor the live script to send the same prompt/context twice with `mode="direct"` and `mode="rlm"`, use context longer than 24,000 characters, assert both responses solve the same objective, and print prompt tokens, completion tokens, cost, and latency separately. Retain real API auth and real provider calls.

```python
def run_mode(mode: str, payload: dict, headers: dict[str, str]) -> dict:
    request = {**payload, "mode": mode}
    response = httpx.post(f"{API_BASE}/v1/completions", json=request, headers=headers, timeout=200)
    response.raise_for_status()
    return response.json()


large_log = "\n".join(
    f"line {index}: {'ERROR' if index in {123, 456, 789} else 'INFO'}"
    for index in range(1, 2001)
)
payload = {
    "prompt": "Count ERROR records and return only the integer count.",
    "context": [{"name": "log", "content": large_log}],
    "backend": "anthropic",
    "model": "claude-sonnet-4-5",
    "max_iterations": 8,
    "max_depth": 1,
}
direct = run_mode("direct", payload, headers)
recursive = run_mode("rlm", payload, headers)
assert "3" in direct["response"]
assert "3" in recursive["response"]
for mode, result in (("direct", direct), ("rlm", recursive)):
    print(mode, result["usage"], result["execution_time_s"], result["savings"])
```

- [ ] **Step 5: Write the operator runbook with exact recovery commands**

The runbook must document prerequisites, read-only inventory, surface baseline, migration planning, confirmation hash, apply, fresh app-server measurement, acceptance checks, rollback, and recovery from a partially failed apply. It must explicitly list these current decisions:

- Disable after verified import: `superpowers@superpowers-dev`, `superpowers@superpowers-marketplace`, and `mwdat-android@mwdat-android-marketplace` because their inspected Codex manifests are skill-only.
- Retain as approved exceptions: `claude-mem@claude-mem-local` because it has hooks and MCP, and `codex-security@openai-curated` because it has an app and MCP.
- Leave `~/.codex/skills/.system` untouched.
- Relocate unique project skills only through a later reviewed plan; this cutover relocates project copies only when their tree hashes duplicate imported global content.

Implement `write_cutover_report` so measured JSON artifacts produce the evidence document without copying absolute source paths, config contents, task text, or skill bodies. Add `harqer evidence cutover --before PATH --after PATH --inventory PATH --import-report PATH --evaluation PATH --plan-reference PATH --output PATH`. The unit test supplies sentinel values such as `SECRET_SKILL_BODY` and `/home/private/source` in input artifacts, asserts neither string appears in the report, and asserts the report contains counts, description-character reduction, hashes, routing metrics, retained exceptions, and the exact rollback command.

- [ ] **Step 6: Run all offline verification**

Run: `python -m pytest tests/unit tests/integration -q`

Expected: all offline tests pass; any explicitly marked live test remains excluded unless real credentials are present.

Run: `python -m compileall -q app scripts tests`

Expected: exit code 0.

- [ ] **Step 7: Commit truthful docs and compatibility metadata**

```bash
git add app/main.py app/rlm_service.py app/usage_comparison.py app/skill_library/evidence.py app/skill_library/cli.py app/schemas.py README.md tests/test_live_integration.py tests/unit/test_usage_comparison.py tests/unit/test_cutover_evidence.py docs/global-skill-migration.md
git commit -m "docs: make RLM accounting and migration claims explicit"
```

### Task 11: Rehearse and Apply the Global Cutover

**Files:**

- Create: `docs/evidence/2026-09-06-global-skill-cutover.md`
- Runtime state: `/home/shaolin/.harqer/`
- Runtime config: `/home/shaolin/.codex/config.toml`
- Runtime discovery roots: `/home/shaolin/.agents/skills/`, `/home/shaolin/.codex/skills/`, `/home/shaolin/Spresso/.agents/skills/`

**Interfaces:**

- Consumes: all Task 1-10 commands and the live global skill/plugin installation.
- Produces: a verified recovery bundle, active global library, one Harqer router plus approved non-skill-plugin exceptions, and before/after evidence.

- [ ] **Step 1: Prove both repositories are clean enough to proceed**

Run:

```bash
git -C /home/shaolin/harqer-rlm-api status --short --branch
git -C /home/shaolin/Spresso status --short --branch
```

Expected: Harqer has only commits from Tasks 1-10 and no unexplained changes. Spresso may retain the user's five already-staged 2026-09-05 plan files; do not include, unstage, or rewrite them.

- [ ] **Step 2: Record the actual Codex baseline before any mutation**

Run:

```bash
/home/shaolin/harqer-rlm-api/scripts/harqer codex surface \
  --cwd /home/shaolin/Spresso \
  --output /tmp/harqer-codex-before.json
```

Expected: a successful live `skills/list` result with no unresolved parse errors. Stop before migration if the response is partial, truncated, or contains a skill error.

- [ ] **Step 3: Generate and inspect the read-only inventory**

Run:

```bash
/home/shaolin/harqer-rlm-api/scripts/harqer skills inventory \
  --source agents-user:agents_user:/home/shaolin/.agents/skills \
  --source codex-user:codex_user:/home/shaolin/.codex/skills \
  --source spresso:repository:/home/shaolin/Spresso/.agents/skills \
  --source superpowers-dev:plugin:/home/shaolin/.codex/plugins/cache/superpowers-dev/superpowers/6.3.0/skills \
  --source superpowers-marketplace:plugin:/home/shaolin/.codex/plugins/cache/superpowers-marketplace/superpowers/6.3.0/skills \
  --source mwdat-android:plugin:/home/shaolin/.codex/plugins/cache/mwdat-android-marketplace/mwdat-android/0.9.0/skills \
  --source claude-mem:plugin:/home/shaolin/.codex/plugins/cache/claude-mem-local/claude-mem/13.24.1/skills \
  --source codex-security-local:plugin:/home/shaolin/.codex/plugins/cache/openai-curated/codex-security/399942ed/skills \
  --source codex-security-remote:plugin:/home/shaolin/.codex/plugins/cache/openai-curated-remote/codex-security/0.1.23/skills \
  --source figma:plugin:/home/shaolin/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills \
  --source deep-research:plugin:/home/shaolin/.codex/plugins/cache/openai-curated-remote/deep-research-work/0.1.14/skills \
  --source plugin-management:plugin:/home/shaolin/.codex/plugins/cache/openai-curated-remote/plugin-management/0.1.0/skills \
  --protect /home/shaolin/.codex/skills/.system \
  --output /tmp/harqer-global-inventory.json
```

Expected: every `SKILL.md` is either a valid document or an explicit issue; `.system` entries are protected; duplicate and conflict groups are present. Compare every enabled user/repo path from `/tmp/harqer-codex-before.json` to an inventory source path and stop if any surface entry is uncovered. Resolve any inventory issue in its source before continuing because the first cutover requires 100 percent coverage.

- [ ] **Step 4: Rehearse apply and rollback against copied roots**

Run:

```bash
/home/shaolin/harqer-rlm-api/scripts/harqer skills migrate rehearse \
  --state-root /tmp/harqer-live-rehearsal-state \
  --codex-home /home/shaolin/.codex \
  --bin-directory /home/shaolin/.local/bin \
  --source agents-user:agents_user:/home/shaolin/.agents/skills \
  --source codex-user:codex_user:/home/shaolin/.codex/skills \
  --source superpowers-dev:plugin:/home/shaolin/.codex/plugins/cache/superpowers-dev/superpowers/6.3.0/skills \
  --source superpowers-marketplace:plugin:/home/shaolin/.codex/plugins/cache/superpowers-marketplace/superpowers/6.3.0/skills \
  --source mwdat-android:plugin:/home/shaolin/.codex/plugins/cache/mwdat-android-marketplace/mwdat-android/0.9.0/skills \
  --source claude-mem:plugin:/home/shaolin/.codex/plugins/cache/claude-mem-local/claude-mem/13.24.1/skills \
  --source codex-security-local:plugin:/home/shaolin/.codex/plugins/cache/openai-curated/codex-security/399942ed/skills \
  --source codex-security-remote:plugin:/home/shaolin/.codex/plugins/cache/openai-curated-remote/codex-security/0.1.23/skills \
  --source figma:plugin:/home/shaolin/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills \
  --source deep-research:plugin:/home/shaolin/.codex/plugins/cache/openai-curated-remote/deep-research-work/0.1.14/skills \
  --source plugin-management:plugin:/home/shaolin/.codex/plugins/cache/openai-curated-remote/plugin-management/0.1.0/skills \
  --project-root /home/shaolin/Spresso/.agents/skills \
  --plugin-root superpowers@superpowers-dev=/home/shaolin/.codex/plugins/cache/superpowers-dev/superpowers/6.3.0 \
  --plugin-root superpowers@superpowers-marketplace=/home/shaolin/.codex/plugins/cache/superpowers-marketplace/superpowers/6.3.0 \
  --plugin-root mwdat-android@mwdat-android-marketplace=/home/shaolin/.codex/plugins/cache/mwdat-android-marketplace/mwdat-android/0.9.0 \
  --plugin-root claude-mem@claude-mem-local=/home/shaolin/.codex/plugins/cache/claude-mem-local/claude-mem/13.24.1 \
  --plugin-root codex-security@openai-curated=/home/shaolin/.codex/plugins/cache/openai-curated-remote/codex-security/0.1.23 \
  --disable-plugin superpowers@superpowers-dev \
  --disable-plugin superpowers@superpowers-marketplace \
  --disable-plugin mwdat-android@mwdat-android-marketplace \
  --retain-plugin claude-mem@claude-mem-local \
  --retain-plugin codex-security@openai-curated \
  --project-duplicates-only
```

Expected: rehearsal reports apply, verify, rollback, and byte-identical restoration as passing while hashes of every supplied live source and `/home/shaolin/.codex/config.toml` remain unchanged.

- [ ] **Step 5: Import live content without changing discovery**

Run:

```bash
/home/shaolin/harqer-rlm-api/scripts/harqer skills import \
  --state-root /home/shaolin/.harqer \
  --inventory /tmp/harqer-global-inventory.json \
  --output /tmp/harqer-global-import.json
```

Expected: all valid documents are represented, unique trees are written once, duplicates reuse existing versions, and versions remain quarantined until the migration plan is applied.

- [ ] **Step 6: Run routing promotion before allowing relocation**

Run:

```bash
/home/shaolin/harqer-rlm-api/scripts/harqer eval routing \
  --state-root /home/shaolin/.harqer \
  --suite /home/shaolin/harqer-rlm-api/evals/routing/v1.yaml \
  --repetitions 100 \
  --activate-import /tmp/harqer-global-import.json \
  --output /tmp/harqer-routing-evaluation.json
```

Expected: exact recall 1.0, high-risk gate recall 1.0, required recall at least 0.90, zero forbidden loads, at most two primary bodies on average, p95 no more than 50 ms, and zero model tokens.

- [ ] **Step 7: Generate the live migration plan**

Run:

```bash
/home/shaolin/harqer-rlm-api/scripts/harqer skills migrate plan \
  --state-root /home/shaolin/.harqer \
  --codex-home /home/shaolin/.codex \
  --bin-directory /home/shaolin/.local/bin \
  --source agents-user:agents_user:/home/shaolin/.agents/skills \
  --source codex-user:codex_user:/home/shaolin/.codex/skills \
  --source superpowers-dev:plugin:/home/shaolin/.codex/plugins/cache/superpowers-dev/superpowers/6.3.0/skills \
  --source superpowers-marketplace:plugin:/home/shaolin/.codex/plugins/cache/superpowers-marketplace/superpowers/6.3.0/skills \
  --source mwdat-android:plugin:/home/shaolin/.codex/plugins/cache/mwdat-android-marketplace/mwdat-android/0.9.0/skills \
  --source claude-mem:plugin:/home/shaolin/.codex/plugins/cache/claude-mem-local/claude-mem/13.24.1/skills \
  --source codex-security-local:plugin:/home/shaolin/.codex/plugins/cache/openai-curated/codex-security/399942ed/skills \
  --source codex-security-remote:plugin:/home/shaolin/.codex/plugins/cache/openai-curated-remote/codex-security/0.1.23/skills \
  --source figma:plugin:/home/shaolin/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills \
  --source deep-research:plugin:/home/shaolin/.codex/plugins/cache/openai-curated-remote/deep-research-work/0.1.14/skills \
  --source plugin-management:plugin:/home/shaolin/.codex/plugins/cache/openai-curated-remote/plugin-management/0.1.0/skills \
  --project-root /home/shaolin/Spresso/.agents/skills \
  --inventory /tmp/harqer-global-inventory.json \
  --import-report /tmp/harqer-global-import.json \
  --router-verification /tmp/harqer-routing-evaluation.json \
  --plugin-root superpowers@superpowers-dev=/home/shaolin/.codex/plugins/cache/superpowers-dev/superpowers/6.3.0 \
  --plugin-root superpowers@superpowers-marketplace=/home/shaolin/.codex/plugins/cache/superpowers-marketplace/superpowers/6.3.0 \
  --plugin-root mwdat-android@mwdat-android-marketplace=/home/shaolin/.codex/plugins/cache/mwdat-android-marketplace/mwdat-android/0.9.0 \
  --plugin-root claude-mem@claude-mem-local=/home/shaolin/.codex/plugins/cache/claude-mem-local/claude-mem/13.24.1 \
  --plugin-root codex-security@openai-curated=/home/shaolin/.codex/plugins/cache/openai-curated/codex-security/399942ed \
  --disable-plugin superpowers@superpowers-dev \
  --disable-plugin superpowers@superpowers-marketplace \
  --disable-plugin mwdat-android@mwdat-android-marketplace \
  --retain-plugin claude-mem@claude-mem-local \
  --retain-plugin codex-security@openai-curated \
  --project-duplicates-only \
  --output /tmp/harqer-live-plan-reference.json
```

Expected: the printed plan archives all unprotected global skill directories, archives only hash-duplicate Spresso project directories, leaves `.system` unchanged, includes exactly three disable mutations and two retained exceptions, and prints a plan path plus SHA-256.

- [ ] **Step 8: Review and apply exactly the generated plan**

Open the plan path recorded in `/tmp/harqer-live-plan-reference.json`, verify its actions match the Step 7 expectation, then run:

```bash
HARQER_REVIEWED_PLAN_PATH="$(jq -r '.path' /tmp/harqer-live-plan-reference.json)"
HARQER_REVIEWED_PLAN_SHA256="$(jq -r '.sha256' /tmp/harqer-live-plan-reference.json)"
test "$(sha256sum "${HARQER_REVIEWED_PLAN_PATH}" | cut -d ' ' -f 1)" = "${HARQER_REVIEWED_PLAN_SHA256}"
/home/shaolin/harqer-rlm-api/scripts/harqer skills migrate apply \
  --state-root /home/shaolin/.harqer \
  --plan "${HARQER_REVIEWED_PLAN_PATH}" \
  --confirm "${HARQER_REVIEWED_PLAN_SHA256}" \
  --output /tmp/harqer-live-apply.json
```

Expected: the independent `sha256sum` comparison succeeds, state is `applied`, every completed journal action has verified before/after hashes, and no permanent deletion occurs.

- [ ] **Step 9: Measure a fresh Codex process and enforce the 85 percent gate**

Run:

```bash
/home/shaolin/harqer-rlm-api/scripts/harqer codex surface \
  --cwd /home/shaolin/Spresso \
  --output /tmp/harqer-codex-after.json

/home/shaolin/harqer-rlm-api/scripts/harqer codex compare-surfaces \
  --before /tmp/harqer-codex-before.json \
  --after /tmp/harqer-codex-after.json \
  --minimum-user-metadata-reduction 0.85
```

Expected: `harqer-superpowers` is visible; Codex system skills remain; retained Claude Mem/Codex Security skills are identified as approved exceptions; enabled user/repo canonical metadata characters fall by at least 85 percent; command exits 0. If the gate fails, immediately run the exact rollback command printed by `migrate apply`.

- [ ] **Step 10: Smoke exact and implicit loading from the live library**

Run:

```bash
/home/shaolin/harqer-rlm-api/scripts/harqer skills route --state-root /home/shaolin/.harqer --task "Apply ponytail" --explicit ponytail
/home/shaolin/harqer-rlm-api/scripts/harqer skills load --state-root /home/shaolin/.harqer --reference ponytail --body-only
/home/shaolin/harqer-rlm-api/scripts/harqer skills route --state-root /home/shaolin/.harqer --task "Diagnose a flaky test before editing" --phase diagnosis
/home/shaolin/harqer-rlm-api/scripts/harqer skills route --state-root /home/shaolin/.harqer --task "Modify com.meta.wearable camera streaming" --phase pre-edit
```

Expected: `ponytail` resolves exactly; the loaded body hash matches its manifest; debugging routes to the expected process skill; the DAT route returns camera guidance plus required companions.

- [ ] **Step 11: Record redacted evidence and the recovery command**

Run from `/home/shaolin/harqer-rlm-api`:

```bash
scripts/harqer evidence cutover \
  --before /tmp/harqer-codex-before.json \
  --after /tmp/harqer-codex-after.json \
  --inventory /tmp/harqer-global-inventory.json \
  --import-report /tmp/harqer-global-import.json \
  --evaluation /tmp/harqer-routing-evaluation.json \
  --plan-reference /tmp/harqer-live-plan-reference.json \
  --apply-result /tmp/harqer-live-apply.json \
  --output docs/evidence/2026-09-06-global-skill-cutover.md
```

Expected: the report contains repository commit, migration ID, artifact hashes, before/after user/repo counts and description characters, percent reduction, retained exceptions, routing metrics, verification commands, and exact rollback command, with no skill bodies, secrets, unrelated home paths, or full config content.

- [ ] **Step 12: Commit only Harqer evidence**

```bash
git add docs/evidence/2026-09-06-global-skill-cutover.md
git commit -m "docs: record global skill router cutover evidence"
```

## Milestone 1 Completion Gate

Do not begin persistent sessions, kernels, subagents, refinement, goals, heartbeats, or autonomous continuation until all of these are true:

- All offline tests and compilation checks pass.
- The real authenticated skill API test passes when credentials are available, or is explicitly recorded as not run without making an API-deployment claim.
- Every pre-migration user/repo skill is hash-represented in the library or named in an unresolved issue that blocked cutover.
- Registry rebuild succeeds from filesystem manifests after deleting only a disposable test registry.
- Exact aliases, including `ponytail`, `caveman`, and `superpowers:using-superpowers`, resolve.
- Routing evaluation meets every Task 9 promotion threshold.
- Migration rehearsal proves byte-identical rollback.
- Live Codex app-server `skills/list` proves at least 85 percent reduction in enabled user/repo canonical metadata characters.
- `~/.codex/skills/.system` is unchanged.
- Non-skill plugin capabilities remain available through retained plugins.
- The recovery bundle and rollback command are recorded and readable.

Once this gate passes, write the focused Milestone 2 design for persistent sessions, event history, isolated kernels, snapshots, context handles, compaction references, and corrected controlled usage accounting.
