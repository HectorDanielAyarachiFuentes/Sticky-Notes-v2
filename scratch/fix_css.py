import os

file_path = r'c:\Users\Ramoncito\.antigravity\Sticky-Notes-v2\style.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """/* ==========================================================================
   DISEÑO PREMIUM PARA EL LOGIN (TARJETA GLASSMORPHISM)
   ========================================================================== */
.login-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    box-sizing: border-box;
}

body.logged-in .login-overlay {
    display: none;
}

.login-card {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 32px;
    padding: 50px 40px;
    width: 100%;
    max-width: 420px;
    text-align: center;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
    animation: cardAppear 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes cardAppear {
    from { opacity: 0; transform: translateY(30px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

.login-logo {
    font-size: 50px;
    display: block;
    margin-bottom: 20px;
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
}

.login-header h1 {
    font-size: 28px;
    margin-bottom: 10px;
    color: white;
    font-weight: 700;
}

.login-header p {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 40px;
}

.login-actions {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.login-btn {
    width: 100%;
    padding: 14px 24px;
    border-radius: 16px;
    border: none;
    font-family: 'Poppins', sans-serif;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.login-btn.primary {
    background: white;
    color: #1a1a1a;
}

.login-btn.primary:hover {
    background: #f0f0f0;
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
}

.login-divider {
    display: flex;
    align-items: center;
    gap: 15px;
    color: rgba(255, 255, 255, 0.3);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 10px 0;
}

.login-divider::before,
.login-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
}

.login-btn.secondary {
    background: rgba(255, 255, 255, 0.05);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.login-btn.secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-3px);
}

.btn-icon {
    font-size: 18px;
}

.login-footer {
    margin-top: 40px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.4);
}

/* Ajustes para la bandera cuando el login está activo */
body.logged-out #flag-wrapper {
    left: 2%;
    opacity: 0.8;
}"""

new_block = """/* ==========================================================================
   DISEÑO PREMIUM PARA EL LOGIN (TARJETA GLASSMORPHISM)
   ========================================================================== */
.login-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    box-sizing: border-box;
}

body.logged-in .login-overlay {
    display: none;
}

.login-card {
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(35px) saturate(200%);
    -webkit-backdrop-filter: blur(35px) saturate(200%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 40px;
    padding: 60px 45px;
    width: 100%;
    max-width: 440px;
    text-align: center;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.1);
    animation: cardAppear 1s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes cardAppear {
    from { opacity: 0; transform: translateY(30px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

.login-logo {
    font-size: 60px;
    display: block;
    margin-bottom: 25px;
    filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.2));
    animation: rocketFloat 3s ease-in-out infinite;
}

@keyframes rocketFloat {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-10px) rotate(5deg); }
}

.login-header h1 {
    font-size: 32px;
    margin-bottom: 12px;
    color: white;
    font-weight: 700;
    letter-spacing: -0.5px;
}

.login-header p {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 45px;
}

.login-actions {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.login-btn {
    width: 100%;
    padding: 16px 24px;
    border-radius: 18px;
    border: none;
    font-family: 'Poppins', sans-serif;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.login-btn.primary {
    background: #ffffff;
    color: #1e293b;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.login-btn.primary:hover {
    background: #f8fafc;
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
}

.login-divider {
    display: flex;
    align-items: center;
    gap: 15px;
    color: rgba(255, 255, 255, 0.2);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin: 10px 0;
}

.login-divider::before,
.login-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
}

.login-btn.secondary {
    background: rgba(255, 255, 255, 0.03);
    color: #f1f5f9;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.login-btn.secondary:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.btn-icon {
    font-size: 20px;
}

.login-footer {
    margin-top: 45px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.3);
}

/* Ajustes para la bandera cuando el login está activo */
body.logged-out #flag-wrapper {
    left: 2%;
    opacity: 0.8;
}"""

# Normalize line endings
content = content.replace('\r\n', '\n')
old_block = old_block.replace('\r\n', '\n')
new_block = new_block.replace('\r\n', '\n')

if old_block in content:
    new_content = content.replace(old_block, new_block)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Success")
else:
    print("Old block not found")
