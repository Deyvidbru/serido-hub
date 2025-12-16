const API_URL = (window.API_BASE_URL || '/api');

function saveAuth(data) {
  if (!data) return;

  const token =
    data.token ||
    data.accessToken ||
    data.jwt ||
    data?.data?.token ||
    data?.data?.accessToken;

  const user =
    data.user ||
    data.usuario ||
    data?.data?.user ||
    data?.data?.usuario;

  if (token) {
    localStorage.setItem('token', token);
    localStorage.setItem('authToken', token);
  }

  if (user) {
    const userStr = JSON.stringify(user);
    localStorage.setItem('user', userStr);
    localStorage.setItem('currentUser', userStr); 
  }
}

function getCurrentUser() {
  const raw = localStorage.getItem('user') || localStorage.getItem('currentUser');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('authToken');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

function setupLoginPage() {
  const stepEmail = document.getElementById('step-email');
  const stepPassword = document.getElementById('step-password');

  const emailForm = document.getElementById('email-form');
  const passwordForm = document.getElementById('password-form');

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');

  const displayEmail = document.getElementById('display-email');
  const changeEmailLink = document.getElementById('change-email');

  if (
    !stepEmail ||
    !stepPassword ||
    !emailForm ||
    !passwordForm ||
    !emailInput ||
    !passwordInput ||
    !emailError ||
    !passwordError ||
    !displayEmail ||
    !changeEmailLink
  ) {
    return;
  }

  let currentEmail = '';

  function isAdminEmail(email) {
    return String(email || '').trim().toLowerCase() === 'admin';
  }

  const params = new URLSearchParams(window.location.search);
  const emailFromUrl = params.get('email');
  if (emailFromUrl) {
    emailInput.value = emailFromUrl;
    currentEmail = emailFromUrl;
    displayEmail.textContent = emailFromUrl;
    stepEmail.classList.add('d-none');
    stepPassword.classList.remove('d-none');
    passwordInput.focus();
  }

  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    emailError.textContent = '';

    const email = emailInput.value.trim();

    if (!email) {
      emailError.textContent = 'Por favor, informe um e-mail.';
      return;
    }

    if (isAdminEmail(email)) {
      currentEmail = 'admin';
      displayEmail.textContent = 'admin';
      stepEmail.classList.add('d-none');
      stepPassword.classList.remove('d-none');
      passwordInput.focus();
      return;
    }

    try {
      const resp = await fetch(`${API_URL}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        emailError.textContent =
          data.message || 'Erro ao verificar e-mail. Tente novamente.';
        return;
      }

      if (!data.exists) {
        const irCadastro = confirm(
          'Não encontramos uma conta com esse e-mail. Deseja criar uma conta?'
        );

        if (irCadastro) {
          window.location.href = `cadastro.html?email=${encodeURIComponent(
            email
          )}`;
        }

        return;
      }

      if (data.status === false || data.status === 'inativo' || data.status === 'bloqueado') {
        emailError.textContent =
          'Esta conta está desativada. Entre em contato com o suporte.';
        return;
      }

      currentEmail = email;
      displayEmail.textContent = email;

      stepEmail.classList.add('d-none');
      stepPassword.classList.remove('d-none');

      passwordInput.focus();
    } catch (err) {
      console.error(err);
      emailError.textContent = 'Erro de conexão com o servidor.';
    }
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    passwordError.textContent = '';

    const senha = passwordInput.value.trim();

    if (!senha) {
      passwordError.textContent = 'Por favor, informe a senha.';
      return;
    }

    if (!currentEmail) {
      passwordError.textContent = 'Erro inesperado. Tente novamente.';
      return;
    }

    const isAdmin = isAdminEmail(currentEmail);
    const endpoint = isAdmin ? `${API_URL}/auth/admin-login` : `${API_URL}/auth/login`;

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail, senha }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        passwordError.textContent =
          data.message || 'E-mail ou senha inválidos.';
        return;
      }

      saveAuth(data);

      if (isAdmin) {
        window.location.href = 'admin-dashboard.html';
      } else {
        window.location.href = 'index.html';
      }
    } catch (err) {
      console.error(err);
      passwordError.textContent = 'Erro de conexão com o servidor.';
    }
  });

  changeEmailLink.addEventListener('click', (e) => {
    e.preventDefault();

    stepPassword.classList.add('d-none');
    stepEmail.classList.remove('d-none');

    passwordInput.value = '';
    passwordError.textContent = '';

    emailInput.focus();
  });
}

function setupCadastroPage() {
  const params = new URLSearchParams(window.location.search);
  const emailFromUrl = params.get('email');
  if (emailFromUrl) {
    const emailInput = document.getElementById('email');
    if (emailInput) emailInput.value = emailFromUrl;
  }

  const form = document.getElementById('cadastro-form');
  const errorBox = document.getElementById('cadastro-error');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorBox) errorBox.textContent = '';

    const nome = document.getElementById('nome')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const telefone = document.getElementById('telefone')?.value.trim();
    const tipo = document.getElementById('tipo')?.value;
    const senha = document.getElementById('senha')?.value;
    const confirmarSenha = document.getElementById('confirmarSenha')?.value;

    if (!nome || !email || !tipo || !senha || !confirmarSenha) {
      if (errorBox) {
        errorBox.textContent = 'Preencha todos os campos obrigatórios.';
      } else {
        alert('Preencha todos os campos obrigatórios.');
      }
      return;
    }

    if (senha.length < 8) {
      if (errorBox) {
        errorBox.textContent = 'A senha deve ter pelo menos 8 caracteres.';
      } else {
        alert('A senha deve ter pelo menos 8 caracteres.');
      }
      return;
    }

    if (senha !== confirmarSenha) {
      if (errorBox) {
        errorBox.textContent = 'As senhas não coincidem.';
      } else {
        alert('As senhas não coincidem.');
      }
      return;
    }

    try {
      const resp = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          email,
          telefone: telefone || undefined,
          tipo,
          senha,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        if (errorBox) {
          errorBox.textContent = data.message || 'Erro ao criar conta.';
        } else {
          alert(data.message || 'Erro ao criar conta.');
        }
        return;
      }

      saveAuth(data);
      alert('Conta criada com sucesso!');
      window.location.href = 'index.html';
    } catch (err) {
      console.error(err);
      if (errorBox) {
        errorBox.textContent = 'Erro de conexão com o servidor.';
      } else {
        alert('Erro de conexão com o servidor.');
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname.split('/').pop()?.toLowerCase();

  if (page === 'login.html') {
    setupLoginPage();
  } else if (page === 'cadastro.html') {
    setupCadastroPage();
  }
});
