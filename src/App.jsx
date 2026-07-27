import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CarrinhoProvider } from "./contexts/CarrinhoContext";


import RotaAssinante from "./components/RotaAssinante";
import RotaProtegida from "./components/RotaProtegida";

import Planos from "./pages/Planos";
import PagamentoSucesso from "./pages/PagamentoSucesso";
import Assinar from "./pages/Assinar";
import MinhaAssinatura from "./pages/MinhaAssinatura";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Admin from "./pages/Admin";

import CriarEmpresa from "./pages/CriarEmpresa";
import AdicionarProduto from "./pages/AdicionarProduto";
import GerenciarProdutos from "./pages/GerenciarProdutos";
import EditarProduto from "./pages/EditarProduto";
import VariacoesProduto from "./pages/VariacoesProduto";

import ConfiguracoesEmpresa from "./pages/ConfiguracoesEmpresa";
import Catalogo from "./pages/Catalogo";

import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";

function App() {
  return (
    <AuthProvider>
      <CarrinhoProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/login" element={<Login />} />

            <Route
              path="/cadastro"
              element={<Cadastro />}
            />

            <Route
              path="/esqueci-senha"
              element={<EsqueciSenha />}
            />

            <Route
              path="/redefinir-senha"
              element={<RedefinirSenha />}
            />

            <Route
  path="/assinar"
  element={
    <RotaProtegida>
      <Assinar />
    </RotaProtegida>
  }
/>

            <Route
              path="/catalogo/:slug"
              element={<Catalogo />}
            />
<Route path="/planos" element={<Planos />} />
            <Route
              path="/admin"
              element={
                <RotaAssinante>
                  <Admin />
                </RotaAssinante>
              }
            />

            <Route
              path="/criar-empresa"
              element={
                <RotaAssinante>
                  <CriarEmpresa />
                </RotaAssinante>
              }
            />

            <Route
  path="/minha-assinatura"
  element={
    <RotaProtegida>
      <MinhaAssinatura />
    </RotaProtegida>
  }
/>

            <Route
  path="/pagamento-sucesso"
  element={
    <RotaProtegida>
      <PagamentoSucesso />
    </RotaProtegida>
  }
/>

            <Route
              path="/admin/produtos"
              element={
                <RotaAssinante>
                  <GerenciarProdutos />
                </RotaAssinante>
              }
            />

            <Route
              path="/admin/produtos/novo"
              element={
                <RotaAssinante>
                  <AdicionarProduto />
                </RotaAssinante>
              }
            />

            <Route
              path="/admin/produtos/:produtoId/editar"
              element={
                <RotaAssinante>
                  <EditarProduto />
                </RotaAssinante>
              }
            />

            <Route
              path="/admin/produtos/:produtoId/variacoes"
              element={
                <RotaAssinante>
                  <VariacoesProduto />
                </RotaAssinante>
              }
            />

            <Route
              path="/admin/configuracoes"
              element={
                <RotaAssinante>
                  <ConfiguracoesEmpresa />
                </RotaAssinante>
              }
            />
          </Routes>
        </BrowserRouter>
      </CarrinhoProvider>
    </AuthProvider>
  );
}

export default App;