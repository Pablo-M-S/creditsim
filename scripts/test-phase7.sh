#!/usr/bin/env bash
# Teste da Fase 7 (OAuth mock + webhook do banco).
# Rodar da raiz do repo, com o Strapi de pé na 7870:
#   CUSTOMER_PASSWORD=suasenha bash scripts/test-phase7.sh

API="${API:-http://localhost:7870/api}"
CUSTOMER_EMAIL="${CUSTOMER_EMAIL:-customer@test.com}"
: "${CUSTOMER_PASSWORD:?defina CUSTOMER_PASSWORD}"

CID=$(grep '^PARTNER_CLIENT_ID=' app/.env | cut -d= -f2-)
CSEC=$(grep '^PARTNER_CLIENT_SECRET=' app/.env | cut -d= -f2-)
JSON='Content-Type: application/json'

echo "== 1) Login do customer"
JWT=$(curl -s -X POST "$API/auth/local" -H "$JSON" \
  -d "{\"identifier\":\"$CUSTOMER_EMAIL\",\"password\":\"$CUSTOMER_PASSWORD\"}" | jq -r .jwt)
[ "$JWT" = "null" ] || [ -z "$JWT" ] && { echo "FALHOU: login"; exit 1; }
echo "ok"

echo "== 2) Simulacao (cria loan simulated)"
LOAN=$(curl -s -X POST "$API/loans/simulate" -H "Authorization: Bearer $JWT" -H "$JSON" \
  -d '{"data":{"principal":5000,"interestRate":0.02,"termMonths":6,"amortizationSystem":"PRICE"}}' \
  | jq -r .data.loan.documentId)
echo "loan: $LOAN"

echo "== 3) Token com secret errado (esperado 401)"
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$API/partner/oauth/token" \
  -d grant_type=client_credentials -d client_id="$CID" -d client_secret=errado

echo "== 4) Token valido (esperado 200)"
TOKEN=$(curl -s -X POST "$API/partner/oauth/token" \
  -d grant_type=client_credentials -d client_id="$CID" -d client_secret="$CSEC" \
  | jq -r .access_token)
[ "$TOKEN" = "null" ] || [ -z "$TOKEN" ] && { echo "FALHOU: token"; exit 1; }
echo "ok"

echo "== 5) Webhook sem token (esperado 401)"
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$API/webhooks/bank-decision" -H "$JSON" \
  -d "{\"loanId\":\"$LOAN\",\"decision\":\"approved\"}"

echo "== 6) Webhook aprovando (esperado 200)"
curl -s -X POST "$API/webhooks/bank-decision" -H "Authorization: Bearer $TOKEN" -H "$JSON" \
  -d "{\"loanId\":\"$LOAN\",\"decision\":\"approved\",\"reason\":\"score ok\"}"
echo

echo "== 7) Repetir o webhook (esperado 409)"
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$API/webhooks/bank-decision" \
  -H "Authorization: Bearer $TOKEN" -H "$JSON" \
  -d "{\"loanId\":\"$LOAN\",\"decision\":\"rejected\"}"

echo "== 8) Status do loan visto pelo customer (esperado approved)"
curl -s "$API/loans" -H "Authorization: Bearer $JWT" \
  | jq -r --arg id "$LOAN" '.data[] | select(.documentId==$id) | .loanStatus'
