# Interception

Birth and death REGISTER are intercepted. Marriage REGISTER still accepts immediately (200 + registration number).

Confirmed interceptable from `nigeria-countryconfig/src/api/action-confirmation.md` and the 2.1 docs: NOTIFY, DECLARE, EDIT, REGISTER, REJECT, ARCHIVE, UNARCHIVE, PRINT_CERTIFICATE, CUSTOM, REQUEST_CORRECTION, APPROVE_CORRECTION, REJECT_CORRECTION. This work only changes birth and death REGISTER.

## Sequence

```mermaid
sequenceDiagram
  participant Registrar
  participant Core as OpenCRVS Core
  participant CC as nigeria-countryconfig
  participant Bridge as civreg-bridge
  participant Stub as stub-identity-api

  Registrar->>Core: Register
  Core->>CC: POST /trigger/events/{birth|death}/actions/REGISTER<br/>(service token, no scopes)
  CC->>Bridge: POST /intercept/register<br/>{eventId, actionId, kind, action}
  Bridge->>Bridge: persist (idempotent on eventId+actionId)
  Bridge-->>CC: 202
  CC-->>Core: 202 (action stays Requested, user unassigned)
  Core-->>Registrar: pending

  Bridge->>Stub: POST /nin-requests (birth) or /deceased-status-events (death)
  alt stub issues DEMO NIN / accepts deceased
    Stub-->>Bridge: 202 then GET issued
    Bridge->>Core: POST /auth/token (client_credentials in BODY)
    Core-->>Bridge: system access_token
    Bridge->>Core: register.accept (registrationNumber)
    Core-->>Bridge: accepted
  else stub fails after retries
    Bridge->>Core: POST /auth/token (client_credentials in BODY)
    Bridge->>Core: register.reject
  end
```

Auth: `grant_type=client_credentials` in `application/x-www-form-urlencoded` body. Never in the query string — 2.1 rejects that outside production.

The trigger token is not used for accept or reject. Human tokens are refused. Scopes `record.action.accept` and `record.action.reject` sit only on the `civreg-bridge` integration, not on a NIMS human role.

Logs use `eventId` and `actionId` only. No names, no NIN, no declaration fields.

## Could not verify

- A live birth sitting pending then completing in the UI (run that yourself).
- Whether `host.docker.internal:3042` from the countryconfig pod actually reaches compose on this machine.
- Whether events calls `GET /trigger/system/ready` again without a restart after `INTEGRATIONS` is filled. If Integrations does not list `civreg-bridge`, restart the events pod.
- Informant email/SMS after async accept. The template still sends that mail on the 200 path only.
- Exact Core error if someone assigns themselves while confirmation is pending (`CONFLICT: User is assigned to this event` in the docs).
- Death maker-checker (different user, reversal). Death is auto-resolved in this slice.
