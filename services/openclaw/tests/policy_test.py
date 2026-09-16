from pathlib import Path

import yaml

ROOT = Path(__file__).parents[1]
BASELINE_PATH = ROOT / "nemoclaw-blueprint" / "policies" / "openclaw-sandbox.yaml"
TOOL_POLICY_PATH = ROOT / "tool-policy.yaml"


def load_yaml(path: Path):
    return yaml.safe_load(path.read_text())


def test_baseline_uses_verified_nemoclaw_schema_and_deny_by_default_shape():
    policy = load_yaml(BASELINE_PATH)
    assert policy["version"] == 1
    assert policy["filesystem_policy"]["include_workdir"] is True
    assert "/sandbox" in policy["filesystem_policy"]["read_write"]
    assert policy["process"] == {"run_as_user": "sandbox", "run_as_group": "sandbox"}
    nvidia = policy["network_policies"]["nvidia"]
    assert nvidia["endpoints"] == [{
        "host": "integrate.api.nvidia.com",
        "port": 443,
        "protocol": "rest",
        "enforcement": "enforce",
        "rules": [
            {"allow": {"method": "POST", "path": "/v1/chat/completions"}},
            {"allow": {"method": "POST", "path": "/v1/completions"}},
            {"allow": {"method": "POST", "path": "/v1/embeddings"}},
            {"allow": {"method": "GET", "path": "/v1/models"}},
            {"allow": {"method": "GET", "path": "/v1/models/**"}},
        ],
        "binaries": [{"path": "/usr/local/bin/openclaw"}],
    }]


def test_baseline_does_not_grant_general_github_or_public_web_egress():
    policy = load_yaml(BASELINE_PATH)
    hosts = {
        endpoint["host"]
        for entry in policy["network_policies"].values()
        for endpoint in entry.get("endpoints", [])
    }
    assert "github.com" not in hosts
    assert "api.github.com" not in hosts
    assert "*" not in hosts


def test_tool_policy_exposes_only_discovery_and_checkout_preparation():
    policy = load_yaml(TOOL_POLICY_PATH)
    names = {tool["name"] for tool in policy["tools"]}
    assert names == {
        "search_products",
        "read_product_page",
        "prepare_cart",
        "request_checkout_confirmation",
    }
    assert not names & {"submit_payment", "stripe_charge", "wallet_sign", "enter_credentials", "shell_exec"}
    for tool in policy["tools"]:
        assert tool["requires_confirmation"] is (tool["name"] in {"prepare_cart", "request_checkout_confirmation"})


def test_tool_policy_redacts_credentials_and_limits_network_and_workspace():
    policy = load_yaml(TOOL_POLICY_PATH)
    assert policy["filesystem"]["write_paths"] == ["/sandbox", "/tmp"]
    assert policy["filesystem"]["deny_paths"] == ["/etc", "/root", "/home"]
    assert policy["credentials"]["source"] == "openshell_gateway"
    assert policy["credentials"]["raw_values_exposed_to_agent"] is False
    assert policy["network"]["deny_by_default"] is True
    assert policy["network"]["allowed_hosts"] == ["integrate.api.nvidia.com"]
