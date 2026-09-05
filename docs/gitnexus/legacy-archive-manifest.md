# Legacy archive manifest

## `terraform/tfplan`

- Removed from the workspace on 2026-09-04.
- Classification: generated Terraform binary plan, not source configuration.
- Original file type: ZIP archive produced by Terraform.
- SHA-256: `d7d8c2e5cb85df451f51b252e090750e64af562e23e77d085dacbe76ca856d14`
- Preserved copy: `/tmp/spresso-legacy-archive/terraform/tfplan`
- Reason: the plan is version-specific and non-portable; the repository's Terraform HCL remains the source of truth. CI already creates a fresh plan under `/tmp`.
- No Terraform HCL, provider configuration, or CI plan-generation behavior was changed.
