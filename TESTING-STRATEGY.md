# CANADA Solar ERP — Comprehensive End-to-End Testing Strategy

## 1. PROJECT OVERVIEW

CANADA Solar ERP is a full-stack enterprise resource planning application built with **Angular 21** on the frontend, **Node.js/Express** on the backend, **Sequelize ORM** for data access, and **SQLite/MySQL** as the database layer. The system manages solar equipment sales, transfers, inventory, customers, orders, installations, repairs, finance, and multi-operator payment workflows across national and international contexts.

---

## 2. TIER 1: UNIT TESTING

### 2.1 Purpose and Scope

Unit tests form the foundation of the testing pyramid. They validate individual functions, services, components, and route handlers in isolation from external dependencies (databases, APIs, file systems). Unit tests are fast, deterministic, and run on every commit via CI. They target:

- Pure business logic (fee calculations, status transitions, validation rules)
- Frontend service HTTP wrappers (request construction, response mapping, error handling)
- Component methods and property bindings
- Route handler input validation and response serialization
- Authentication and authorization middleware

### 2.2 Test Case Design Principles

| Principle | Description |
|-----------|-------------|
| **Happy Path** | Valid inputs, expected successful outputs, 200/201 responses |
| **Edge Cases** | Boundary values (zero amounts, empty strings, max page limits, date ranges spanning midnight) |
| **Error Handling** | Missing required fields, invalid formats, unauthorized access, not-found resources, database constraint violations |
| **Idempotency** | Repeating the same operation produces the same result or safe failure |
| **Security** | Role-based access denial, token expiry, SQL injection resistance, payload sanitization |

### 2.3 Fee Calculation Test Scenarios

The ERP applies operator-specific fees based on transfer type:

| Scenario | Transfer Type | Expected Fee Range | Notes |
|----------|--------------|-------------------|-------|
| National transfer | national | 1% – 2% of amount | Min/max fee clamping |
| International transfer | international | 3% – 5% of amount | Cross-border surcharge |
| Zero amount | any | 0 or minimum fee | Avoid division by zero |
| Negative amount | any | Validation error | Reject before fee calc |
| Null/undefined amount | any | Validation error | 400 response |
| Large amount (> 1M) | any | Correct proportional fee | Precision/overflow check |

**Test assertions:**
- fees === amount * rate within rounding tolerance
- Fees never negative
- Fees correctly rounded to 2 decimal places
- Rate selection based on transferType field, not country alone

### 2.4 Field Validation Test Scenarios

| Field | Valid Input | Invalid Input | Expected Result |
|-------|------------|--------------|----------------|
| operator | orange_money, moov_money, wave | paypal, null, "" | 400 Bad Request |
| type | sent, received | refund, 123 | 400 Bad Request |
| amount | 1000, 0.50 | -100, "abc", undefined | 400 Bad Request |
| customerPhone | Valid phone format | Malformed phone | 400 or sanitized |
| agentId | UUID/string ID | Empty string when required | 400 or default |
| reference | Alphanumeric string | SQL injection payload | Sanitized / truncated |
| status | pending, completed, failed, cancelled | "unknown" | 400 or ignored |

### 2.5 Data Formatting Test Scenarios

| Data Type | Test Case | Expected Behavior |
|-----------|-----------|-------------------|
| Currency | amount = 1234.5 | Display as locale-appropriate formatted |
| Currency | amount = 0 | Display as 0.00 |
| Currency | amount = null | Display as — or 0.00 |
| Date | ISO string 2026-08-01T12:00:00Z | Localized format 01/08/2026 12:00 |
| Date | Invalid date string | Fallback to — or empty |
| Status Labels | pending | Translation "En attente" (FR) |
| Status Labels | completed | Translation "Complété" |
| Status Labels | failed | Translation "Échoué" |

### 2.6 Core Business Rule Test Scenarios

#### Transfer Status Transitions

| From | To | Allowed | Expected Response |
|------|----|---------|------------------|
| pending | completed | Yes | 200, status updated |
| pending | failed | Yes | 200, status updated |
| completed | pending | No | 400 or 403 |
| completed | failed | No | 400 or 403 |
| failed | completed | No | 400 or 403 |
| cancelled | any | No | 400 or 403 |
| pending → completed (duplicate) | completed | Idempotent | 200, no error |

#### Operator-Country Mapping

| Operator | Country Context | Expected Behavior |
|----------|----------------|-------------------|
| orange_money | CI (Côte d'Ivoire) | National rate 1-2% |
| orange_money | International | International rate 3-5% |
| moov_money | CI | National rate 1-2% |
| moov_money | International | International rate 3-5% |
| wave | SN (Sénégal) | National rate 1-2% |
| wave | International | International rate 3-5% |

#### Role-Based Access Control

| Role | Access Level | Example Endpoint |
|------|-------------|-----------------|
| admin | Full access | All routes |
| cashier | Orders, transfers, finance | POST /api/transfers |
| seller | Products, orders, customers | GET /api/orders |
| technician | Installations, repairs | GET /api/installations |
| delivery | Limited order view | GET /api/orders/:id |
| Unauthenticated | No access | Any protected route → 403 |

### 2.7 Code Coverage Requirements

| Module | Minimum Coverage | Tool | Notes |
|--------|-----------------|------|-------|
| TransferService (frontend) | ≥ 90% | Vitest/Istanbul | Critical path for revenue |
| TransferComponent (frontend) | ≥ 85% | Vitest/Istanbul | UI state management |
| auth utility (backend) | ≥ 95% | Jest/Istanbul | Security-critical |
| All route handlers (backend) | ≥ 80% | Jest/Istanbul | Each route file |
| All services (backend) | ≥ 85% | Jest/Istanbul | Business logic services |
| Components (frontend) | ≥ 80% | Vitest/Istanbul | Per component spec |