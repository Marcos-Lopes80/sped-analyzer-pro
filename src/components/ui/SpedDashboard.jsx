import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Upload, FileText, AlertCircle, Info, LayoutGrid, Download, FileDown, User } from 'lucide-react';

// Tipagem para os erros encontrados
interface SpedError {
  linha: string;
  bloco: string;
  descricao: string;
  tipo: 'CRÍTICO' | 'AVISO' | 'IDENTIDADE';
}

const SpedDashboard = () => {
  const [data, setData] = useState<any>(null); // Dados do arquivo
  const [errors, setErrors] = useState<SpedError[]>([]);
  const [contribuinte, setContribuinte] = useState({ nome: "Aguardando Arquivo...", cnpj: "00.000.000/0000-00" });

  // Função simulando o início do parsing (Aqui você conectaria o spedParser.ts)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Lógica de Streaming aqui
      console.log("Iniciando auditoria no arquivo:", file.name);
      // Exemplo de captura do Registro 0000 para o Header
      setContribuinte({ nome: "EMPRESA TESTE LTDA", cnpj: "12.345.678/0001-99" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER DINÂMICO (Registro 0000) */}
      <header className="bg-[oklch(35%_0.1_260)] text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-md shadow-sm">
            <AlertCircle className="text-[oklch(35%_0.1_260)]" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase">SPED <span className="font-light">Analyzer Pro</span></h1>
            <p className="text-[10px] opacity-80 tracking-widest">BY VINSAURA TECH</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-right border-r border-white/20 pr-6">
            <p className="font-bold text-blue-100">{contribuinte.nome}</p>
            <p className="text-[10px] opacity-70">CNPJ: {contribuinte.cnpj}</p>
          </div>
          <div className="bg-white/10 hover:bg-white/20 p-2 rounded-full cursor-pointer transition-all">
            <User size={20} />
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1400px] mx-auto space-y-6">
        {/* BOTÃO DE IMPORTAÇÃO REAL */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <label className="bg-[oklch(55%_0.2_250)] hover:bg-[oklch(50%_0.2_250)] text-white px-8 py-4 rounded-lg shadow-md flex items-center gap-3 font-bold transition-all cursor-pointer">
            <Upload size={22} />
            IMPORTAR ARQUIVO SPED (.TXT)
            <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
          </label>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full">
            <StatCard title="Status do 0000" value="VALIDADO" color="green" />
            <StatCard title="Erros Críticos" value="0" color="red" />
            <StatCard title="Blocos" value="C, H, K, 0" color="purple" />
            <StatCard title="Score Fiscal" value="100%" color="blue" />
          </div>
        </div>

        {/* TABELA DE ERROS COM PRESERVAÇÃO DO 0000 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-[oklch(35%_0.1_260)] font-bold flex items-center gap-2">
              <FileText size={18} /> Detalhamento da Auditoria
            </h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100/80 text-[oklch(35%_0.1_260)] text-[11px] font-black uppercase tracking-wider">
                <th className="p-4">Linha</th>
                <th className="p-4">Bloco</th>
                <th className="p-4">Descrição do Evento</th>
                <th className="p-4 text-center">Status / Criticidade</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              <TableRow 
                linha="1" 
                bloco="0000" 
                desc="Identidade confirmada: Período de Apuração e CNPJ consistentes." 
                tipo="IDENTIDADE" 
              />
              {/* Mapear erros reais aqui */}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

// Sub-componentes mantendo o design system
const StatCard = ({ title, value, color }: any) => {
  const colors: any = {
    red: "border-red-500",
    green: "border-emerald-500",
    blue: "border-blue-500",
    purple: "border-purple-500"
  };
  return (
    <div className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${colors[color]} flex flex-col justify-center`}>
      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{title}</p>
      <p className="text-xl font-black text-slate-800">{value}</p>
    </div>
  );
};

const TableRow = ({ linha, bloco, desc, tipo }: any) => {
  const statusStyles: any = {
    IDENTIDADE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CRÍTICO: "bg-red-50 text-red-700 border-red-200",
    AVISO: "bg-amber-50 text-amber-700 border-amber-200"
  };
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="p-4 font-mono text-xs text-slate-400">{linha}</td>
      <td className="p-4 font-bold text-slate-700">{bloco}</td>
      <td className="p-4 text-slate-600">{desc}</td>
      <td className="p-4 text-center">
        <span className={`text-[10px] px-3 py-1 rounded-full font-black border ${statusStyles[tipo]}`}>
          {tipo}
        </span>
      </td>
    </tr>
  );
};

export default SpedDashboard;
