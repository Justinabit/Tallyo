// =============================================================================
// TALLYO — Auth Pages: Login / Signup / Forgot Password / Reset Password
// =============================================================================
import { h, toast } from '../utils/dom.js';
import { signIn, signUp, sendPasswordReset, updatePassword } from '../services/authService.js';
import { isValidEmail, validatePassword, validateRequired, runValidation } from '../utils/validation.js';

function authVisual() {
  return h('div', { class: 'auth-visual' }, [
    h('div', { class: 'auth-visual-brand' }, [
      h('div', { class: 'brand-mark' }, 'T'),
      h('span', { style: 'font-size:19px;font-weight:800' }, 'Tallyo')
    ]),
    h('div', { class: 'auth-visual-copy' }, [
      h('h2', {}, 'Track it. Plan it. Keep it.'),
      h('p', {}, 'Tallyo helps you see exactly where your money goes, build budgets that actually work, and reach your savings goals — one transaction at a time.')
    ]),
    h('div', { class: 'auth-visual-stats' }, [
      stat('₱', 'PHP by default'),
      stat('🔒', 'Bank-grade RLS'),
      stat('📊', 'Real reports')
    ])
  ]);
}
function stat(big, label) {
  return h('div', { class: 'stat' }, [h('b', {}, big), h('span', {}, label)]);
}

export function renderLoginPage() {
  const root = document.getElementById('app-root');
  root.innerHTML = '';

  const emailInput = h('input', { class: 'input', type: 'email', placeholder: 'you@example.com', autocomplete: 'email' });
  const passInput = h('input', { class: 'input', type: 'password', placeholder: '••••••••', autocomplete: 'current-password' });
  const errorBox = h('div', {});
  const submitBtn = h('button', { class: 'btn btn-primary btn-block' }, 'Log In');

  const form = h('form', { class: 'auth-form-box' }, [
    h('h1', {}, 'Welcome back'),
    h('p', { class: 'auth-sub' }, 'Log in to keep tracking your money.'),
    h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Email'), emailInput]),
    h('div', { class: 'form-group' }, [
      h('div', { class: 'flex justify-between' }, [
        h('label', { class: 'field-label' }, 'Password'),
        h('a', { style: 'font-size:11.5px;color:var(--primary);font-weight:700;cursor:pointer', onclick: (e) => { e.preventDefault(); window.location.hash = '#/forgot-password'; } }, 'Forgot password?')
      ]),
      passInput
    ]),
    errorBox,
    submitBtn,
    h('div', { class: 'auth-switch' }, ['New to Tallyo? ', h('a', { onclick: () => (window.location.hash = '#/signup') }, 'Create an account')])
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { valid, errors } = runValidation([
      ['email', isValidEmail(emailInput.value) ? null : 'Please enter a valid email address.'],
      ['password', validateRequired(passInput.value, 'Password')]
    ]);
    errorBox.innerHTML = '';
    if (!valid) { errorBox.appendChild(h('div', { class: 'field-error' }, Object.values(errors)[0])); return; }
    submitBtn.disabled = true; submitBtn.textContent = 'Logging in…';
    try {
      await signIn(emailInput.value.trim(), passInput.value);
      window.location.hash = '#/dashboard';
    } catch (err) {
      errorBox.innerHTML = '';
      errorBox.appendChild(h('div', { class: 'field-error' }, err.message || 'Login failed. Please check your credentials.'));
      submitBtn.disabled = false; submitBtn.textContent = 'Log In';
    }
  });

  root.appendChild(h('div', { class: 'auth-screen' }, [authVisual(), h('div', { class: 'auth-form-side' }, [form])]));
}

export function renderSignupPage() {
  const root = document.getElementById('app-root');
  root.innerHTML = '';

  const nameInput = h('input', { class: 'input', placeholder: 'Juan Dela Cruz', autocomplete: 'name' });
  const emailInput = h('input', { class: 'input', type: 'email', placeholder: 'you@example.com', autocomplete: 'email' });
  const passInput = h('input', { class: 'input', type: 'password', placeholder: 'At least 6 characters', autocomplete: 'new-password' });
  const errorBox = h('div', {});
  const submitBtn = h('button', { class: 'btn btn-primary btn-block' }, 'Create Account');

  const form = h('form', { class: 'auth-form-box' }, [
    h('h1', {}, 'Create your account'),
    h('p', { class: 'auth-sub' }, 'Start tracking your income and expenses in minutes.'),
    h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Full Name'), nameInput]),
    h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Email'), emailInput]),
    h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Password'), passInput]),
    errorBox,
    submitBtn,
    h('div', { class: 'auth-switch' }, ['Already have an account? ', h('a', { onclick: () => (window.location.hash = '#/login') }, 'Log in')])
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { valid, errors } = runValidation([
      ['name', validateRequired(nameInput.value, 'Full name')],
      ['email', isValidEmail(emailInput.value) ? null : 'Please enter a valid email address.'],
      ['password', validatePassword(passInput.value)]
    ]);
    errorBox.innerHTML = '';
    if (!valid) { errorBox.appendChild(h('div', { class: 'field-error' }, Object.values(errors)[0])); return; }
    submitBtn.disabled = true; submitBtn.textContent = 'Creating account…';
    try {
      const data = await signUp(emailInput.value.trim(), passInput.value, nameInput.value.trim());
      if (data.session) {
        toast('Account created! Welcome to Tallyo.', 'success');
        window.location.hash = '#/dashboard';
      } else {
        toast('Account created! Please check your email to confirm, then log in.', 'success');
        window.location.hash = '#/login';
      }
    } catch (err) {
      errorBox.innerHTML = '';
      errorBox.appendChild(h('div', { class: 'field-error' }, err.message || 'Could not create account.'));
      submitBtn.disabled = false; submitBtn.textContent = 'Create Account';
    }
  });

  root.appendChild(h('div', { class: 'auth-screen' }, [authVisual(), h('div', { class: 'auth-form-side' }, [form])]));
}

export function renderForgotPasswordPage() {
  const root = document.getElementById('app-root');
  root.innerHTML = '';

  const emailInput = h('input', { class: 'input', type: 'email', placeholder: 'you@example.com' });
  const errorBox = h('div', {});
  const submitBtn = h('button', { class: 'btn btn-primary btn-block' }, 'Send Reset Link');

  const form = h('form', { class: 'auth-form-box' }, [
    h('h1', {}, 'Reset your password'),
    h('p', { class: 'auth-sub' }, "We'll email you a link to reset your password."),
    h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Email'), emailInput]),
    errorBox,
    submitBtn,
    h('div', { class: 'auth-switch' }, [h('a', { onclick: () => (window.location.hash = '#/login') }, '← Back to login')])
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isValidEmail(emailInput.value)) { errorBox.innerHTML = ''; errorBox.appendChild(h('div', { class: 'field-error' }, 'Please enter a valid email address.')); return; }
    submitBtn.disabled = true; submitBtn.textContent = 'Sending…';
    try {
      await sendPasswordReset(emailInput.value.trim());
      toast('If that email exists, a reset link has been sent.', 'success');
      window.location.hash = '#/login';
    } catch (err) {
      errorBox.innerHTML = '';
      errorBox.appendChild(h('div', { class: 'field-error' }, err.message || 'Could not send reset email.'));
      submitBtn.disabled = false; submitBtn.textContent = 'Send Reset Link';
    }
  });

  root.appendChild(h('div', { class: 'auth-screen' }, [authVisual(), h('div', { class: 'auth-form-side' }, [form])]));
}

export function renderResetPasswordPage() {
  const root = document.getElementById('app-root');
  root.innerHTML = '';

  const passInput = h('input', { class: 'input', type: 'password', placeholder: 'New password (min 6 characters)' });
  const confirmInput = h('input', { class: 'input', type: 'password', placeholder: 'Confirm new password' });
  const errorBox = h('div', {});
  const submitBtn = h('button', { class: 'btn btn-primary btn-block' }, 'Update Password');

  const form = h('form', { class: 'auth-form-box' }, [
    h('h1', {}, 'Set a new password'),
    h('p', { class: 'auth-sub' }, 'Choose a new password for your account.'),
    h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'New Password'), passInput]),
    h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Confirm Password'), confirmInput]),
    errorBox,
    submitBtn
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.innerHTML = '';
    const pwErr = validatePassword(passInput.value);
    if (pwErr) { errorBox.appendChild(h('div', { class: 'field-error' }, pwErr)); return; }
    if (passInput.value !== confirmInput.value) { errorBox.appendChild(h('div', { class: 'field-error' }, 'Passwords do not match.')); return; }
    submitBtn.disabled = true; submitBtn.textContent = 'Updating…';
    try {
      await updatePassword(passInput.value);
      toast('Password updated. Please log in.', 'success');
      window.location.hash = '#/login';
    } catch (err) {
      errorBox.appendChild(h('div', { class: 'field-error' }, err.message || 'Could not update password. The reset link may have expired.'));
      submitBtn.disabled = false; submitBtn.textContent = 'Update Password';
    }
  });

  root.appendChild(h('div', { class: 'auth-screen' }, [authVisual(), h('div', { class: 'auth-form-side' }, [form])]));
}
