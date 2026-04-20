// src/lib/spedParser.ts

export interface SpedAuditResult {
  contribuinte: { nome: string; cnpj: string };
  erros: any[];
  stats: { linhas: number; criticos: number; avisos: number };
}

export const parseSpedStreaming = async (file: File): Promise<SpedAuditResult> => {
  const reader = file.stream().getReader();
  const decoder = new TextDecoder('latin1'); // SPED usa tipicamente Latin1/Windows-1252
  
  let nome = "";
  let cnpj = "";
  let totalLinhas = 0;
  const listaErros: any[] = [];
  const mapaProdutos = new Map();
  
  let partialLine = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = (partialLine + chunk).split('\n');
    partialLine = lines.pop() || "";

    for (const line of lines) {
      totalLinhas++;
      const reg = line.split('|');
      if (reg.length < 2) continue;

      const tipoReg = reg[1];

      // REGRA 0000: Preservação da Identidade (Não criticar)
      if (tipoReg === "0000") {
        nome = reg[6];
        cnpj = reg[7];
      }

      // REGRA 0200: Cadastro Mestre
      if (tipoReg === "0200") {
        mapaProdutos.set(reg[2], { desc: reg[3], ncm: reg[8] });
      }

      // CRUZAMENTO DE OURO: C170 vs 0200
      if (tipoReg === "C170") {
        const codItem = reg[3];
        if (!mapaProdutos.has(codItem)) {
          listaErros.push({
            linha: totalLinhas,
            bloco: "C170",
            desc: `Item [${codItem}] vendido sem estar cadastrado no Bloco 0200.`,
            tipo: "CRÍTICO"
          });
        }
      }
    }
  }

  return {
    contribuinte: { nome, cnpj },
    erros: listaErros,
    stats: { 
      linhas: totalLinhas, 
      criticos: listaErros.length,
      avisos: 0 
    }
  };
};
