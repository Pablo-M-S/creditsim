import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

type Installment = {
  number: number;
  dueDate: string;
  amortization: number;
  interest: number;
  paymentAmount: number;
  remainingBalance: number;
};

type SimulateResult = {
  data: {
    loan: { id: number; principal: number; loanStatus: string };
    installments: Installment[];
  };
};

function App() {
  const [token, setToken] = useState('');
  const [loginEmail, setLoginEmail] = useState('customer@test.com');
  const [loginPassword, setLoginPassword] = useState('87049532');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const [principal, setPrincipal] = useState('10000');
  const [interestRate, setInterestRate] = useState('0.02');
  const [termMonths, setTermMonths] = useState('12');
  const [amortizationSystem, setAmortizationSystem] = useState('PRICE');
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [simError, setSimError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Login falhou');
      setToken(data.jwt);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault();
    setSimError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/loans/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          principal: Number(principal),
          interestRate: Number(interestRate),
          termMonths: Number(termMonths),
          amortizationSystem,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Erro na simulação');
      setResult(data);
    } catch (err: any) {
      setSimError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1>CreditSim</h1>

      {!token ? (
        <form onSubmit={handleLogin}>
          <h2>Login</h2>
          <div style={{ marginBottom: 8 }}>
            <label>Email<br />
              <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} style={{ width: '100%' }} />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Senha<br />
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} style={{ width: '100%' }} />
            </label>
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
          {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
        </form>
      ) : (
        <>
          <p>Logado ✅ <button onClick={() => setToken('')}>Sair</button></p>

          <form onSubmit={handleSimulate}>
            <h2>Simular empréstimo</h2>
            <div style={{ marginBottom: 8 }}>
              <label>Valor (principal)<br />
                <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} style={{ width: '100%' }} />
              </label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Taxa de juros (ex: 0.02 = 2%)<br />
                <input type="number" step="0.001" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} style={{ width: '100%' }} />
              </label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Prazo (meses)<br />
                <input type="number" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} style={{ width: '100%' }} />
              </label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Sistema<br />
                <select value={amortizationSystem} onChange={(e) => setAmortizationSystem(e.target.value)} style={{ width: '100%' }}>
                  <option value="PRICE">PRICE</option>
                  <option value="SAC">SAC</option>
                </select>
              </label>
            </div>
            <button type="submit" disabled={loading}>{loading ? 'Calculando...' : 'Simular'}</button>
            {simError && <p style={{ color: 'red' }}>{simError}</p>}
          </form>

          {result && (
            <div style={{ marginTop: 24 }}>
              <h3>Resultado (empréstimo #{result.data.loan.id})</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Parcela</th>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'right' }}>Valor</th>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'right' }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.installments.map((i) => (
                    <tr key={i.number}>
                      <td>{i.number}</td>
                      <td style={{ textAlign: 'right' }}>{i.paymentAmount.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{i.remainingBalance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
