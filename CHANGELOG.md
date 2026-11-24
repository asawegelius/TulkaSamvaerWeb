# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog, and this repository uses Semantic Versioning.

## [Unreleased]

### Added

- Project set up from AngularAWTemplate.
- OpenAPI contract for the Events section (`api/openapi.yaml`): events, invites, RSVP, who brings what, programme, sleeping plan, recurring events and per-event visibility.
- Mock API that implements the contract, with schema tests.
- Events feature: list, detail with RSVP and bring-list claims, create and edit with the visibility picker.
- Section registry, app shell, page and form layouts, and the style guide's tokens as the theme.

### Fixed

- `ng serve` configurations used the removed `browserTarget` option.
