function analisarSped(content) {
  const linhas = content.split("\n");
  const resultado = { C: [], D: [], E: [], H: [], K: [], "1": [] };

  linhas.forEach((linha, i) => {
    if (linha.startsWith("|C100|") && !linha.includes("CFOP")) {
      resultado.C.push({
        linha: i + 1,
        descricao: "CFOP ausente",
        sugestao: "Verificar CFOP conforme tabela oficial",
        trecho: linha
      });
    }
    if (linha.startsWith("|D100|") && !linha.includes("VALOR")) {
      resultado.D.push({
        linha: i + 1,
        descricao: "Valor não informado",
        sugestao: "Inserir campo VALOR conforme exigência",
        trecho: linha
      });
    }
    // demais blocos seguem lógica semelhante
  });

  return resultado;
}

module.exports = { analisarSped };
