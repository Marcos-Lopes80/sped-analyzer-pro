import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Upload, FileText, AlertCircle, Info, LayoutGrid, Download, FileDown, User 
} from 'lucide-react';

// Dados Mockados para visualização igual à imagem
const barData = [
  { name: 'C100', erros: 450 },
  { name: 'C170', erros: 580 },
  { name: '0150', erros: 320 },
  { name: '0160', erros: 210 },
];
// Exemplo de como estruturar os dados vindo do Java/Supabase
const detailedErrors = [
  { linha: "1", bloco: "0000", desc: "OK - Dados do Contribuinte", tipo: "INFO", setor: "TI" },
  { linha: "450", bloco: "C170", desc: "CST 000 usado para NCM com incidência de ST", tipo: "CRÍTICO", setor: "FISCAL" },
  { linha: "1200", bloco: "0200", desc: "NCM inexistente na tabela da SEFAZ", tipo: "OBSERVAÇÃO", setor: "CADASTRO" }
];

const pieData = [
  { name: 'Erros Fiscais', value: 40, color: '#1E40AF' },
  { name: 'Dados Inconsistentes', value: 35, color: '#7C3AED' },
  { name: 'Outros', value: 25, color: '#10B981' },
];

const SpedDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* HEADER */}
      <header className="bg-[#002B5B] text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded">
            <AlertCircle className="text-[#002B5B]" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SPED <span className="font-light">Analyzer Pro</span></h1>
            <p className="text-[10px] opacity-70">BY VINSAURA TECH</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <p className="font-semibold">Vinsaura Tech</p>
            <p className="text-[10px] opacity-70">CNPJ: 99.992.518/0001-20</p>
          </div>
          <div '="bg-white/20 p-2 rounded-full">
            <User size={20} />
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1400px] mx-auto space-y-6">
        
        {/* TOP BAR: IMPORT & STATS */}
        <div className="flex flex-col md:flex-row gap-4">
          <button className="bg-[#0052CC] hover:bg-blue-700 text-white px-6 py-4 rounded shadow flex items-center gap-2 font-semibold transition-all">
            <Upload size={20} />
            Importar SPED
          </button>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
            <StatCard title="Total de Linhas" value="12,450" icon={<FileText className="text-blue-500" />} />
            <StatCard title="Erros Encontrados" value="85" icon={<AlertCircle className="text-red-500" />} />
            <StatCard title="Avisos" value="23" icon={<Info className="text-yellow-500" />} />
            <StatCard title="Blocos Analisados" value="C100, C170, 0150" icon={<LayoutGrid className="text-purple-500" />} />
          </div>
        </div>

        {/* CHARTS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bar Chart */}
          <div className="md:col-span-2 bg-white rounded-lg shadow p-4 border-t-4 border-[#002B5B]">
            <h3 className="text-gray-700 font-bold mb-4 flex items-center gap-2">Resumo de Erros</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip cursor={{fill: '#f3f4f6'}} />
                  <Bar dataKey="erros" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-center text-gray-400 mt-2 italic">Erros por Bloco</p>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-[#002B5B]">
            <h3 className="text-gray-700 font-bold mb-4">Tipos de Erros</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* DETAILED TABLE */}
        <div className="bg-white rounded-lg shadow border-t-4 border-[#002B5B]">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h3 className="text-[#002B5B] font-bold">Erros Detalhados</h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-1 text-[10px] bg-[#1E40AF] text-white px-3 py-1 rounded hover:bg-blue-900 transition-colors">
                <Download size={14} /> Exportar CSV
              </button>
              <button className="flex items-center gap-1 text-[10px] bg-[#002B5B] text-white px-3 py-1 rounded hover:bg-black transition-colors">
                <FileDown size={14} /> Gerar Relatório PDF
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-[#002B5B] text-xs uppercase">
                  <th className="p-3 border-b">Linha</th>
                  <th className="p-3 border-b">Bloco</th>
                  <th className="p-3 border-b">Descrição do Erro</th>
                  <th className="p-3 border-b">Tipo</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-600">
                <TableRow linha="1025" bloco="C100" desc="Nota fiscal com valor divergente" tipo="Erro Fiscal" isCritical />
                <TableRow linha="2045" bloco="C170" desc="Produto sem NCM informado" tipo="Dados Inconsistentes" />
                <TableRow linha="3012" bloco="0150" desc="Município inválido para a UF de SP" tipo="Erro Fiscal" isCritical />
                <TableRow linha="6164" bloco="E110" desc="Diferença de arredondamento aceitável" tipo="Aviso" isWarning />
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

// COMPONENTES AUXILIARES
const StatCard = ({ title, value, icon }) => (
  <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500 flex justify-between items-center">
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-black text-gray-800">{value}</p>
    </div>
    <div className="p-2 bg-gray-50 rounded-full">{icon}</div>
  </div>
);

const TableRow = ({ linha, bloco, desc, tipo, isCritical, isWarning }) => (
  <tr className="border-b hover:bg-blue-50 transition-colors">
    <td className="p-3 font-mono text-xs">{linha}</td>
    <td className="p-3 font-bold">{bloco}</td>
    <td className="p-3">{desc}</td>
    <td className="p-3">
      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
        isCritical ? 'bg-red-100 text-red-700' : 
        isWarning ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'
      }`}>
        {tipo}
      </span>
    </td>
  </tr>
);

export default SpedDashboard;