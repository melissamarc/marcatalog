import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CarrinhoProvider } from "./contexts/CarrinhoContext";


import RotaAssinante from "./components/RotaAssinante";
import RotaProtegida from "./components/RotaProtegida";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import AdminPlataforma from "./pages/AdminPlataforma";

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
              path="/esqueci-senha"
              element={<EsqueciSenha />}
            />

            <Route
              path="/redefinir-senha"
              element={<RedefinirSenha />}
            />

            <Route
              path="/catalogo/:slug"
              element={<Catalogo />}
            />

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

            <Route
              path="/cadastro"
              element={<Navigate to="/" replace />}
            />

            <Route
              path="/planos"
              element={<Navigate to="/" replace />}
            />

            <Route
              path="/assinar"
              element={<Navigate to="/" replace />}
            />

            <Route
              path="/pagamento-sucesso"
              element={<Navigate to="/" replace />}
            />

            <Route
              path="/minha-assinatura"
              element={<Navigate to="/admin" replace />}
            />

            <Route
  path="/plataforma"
  element={
    <RotaProtegida>
      <AdminPlataforma />
    </RotaProtegida>
  }
/>

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </BrowserRouter>
      </CarrinhoProvider>
    </AuthProvider>
   
  );
}

export default App;