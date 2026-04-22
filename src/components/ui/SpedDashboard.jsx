import React, { useState } from "react";

export default function SpedDashboard() {
  const [detalhes, setDetalhes] = useState([]);

  async function abrirDetalhes(bloco) {
    const res = await fetch(`/details/${bloco}`);
    const data = await res.json();
    setDetalhes(data.detalhes);
  }

  return (
    <div>
      <h1>SPED Analyzer Pro</h1>
      <div className="blocos">
        <button className="btn btn-danger" onClick={() => abrirDetalhes("C")}>Bloco C - Erros</button>
        <button className="btn btn-warning" onClick={() => abrirDetalhes("D")}>Bloco D - Avisos</button>
        <button className="btn btn-success" onClick={() => abrirDetalhes("E")}>Bloco E - Válido</button>
        {/* demais blocos */}
      </div>

      {detalhes.length > 0 && (
        <table className="table">
          <thead>
            <tr><th>Linha</th><th>Descrição</th><th>Sugestão</th></tr>
          </thead>
          <tbody>
            {detalhes.map((d, idx) => (
              <tr key={idx}>
                <td>{d.linha}</td>
                <td>{d.descricao}</td>
                <td>{d.sugestao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
