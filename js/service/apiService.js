const API_BASE_URL = "http://localhost:8081";

/**
 * Uma função 'fetch' para adicionar automaticamente o token JWT.
 * @param {string} endpoint O endpoint da API a ser chamado (ex: '/api/groups').
 * @param {object} options As opções do fetch (method, body...).
 * @returns {Promise<any>} A promessa com os dados da resposta em JSON.
 */
async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem("chat_jwt_token");
  const headers = new Headers(options.headers || {});
  headers.append("Content-Type", "application/json");
  if (token) {
    headers.append("Authorization", `Bearer ${token}`);
  }
  //Junta as opções
  const config = {
    ...options,
    headers: headers,
  };
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Erro: ${response.status}`);
  }
  //No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
export { fetchWithAuth };
