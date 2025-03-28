import React, { useState } from "react";
import './Login.css';
import logo from './logo.png';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = () => {
    const user = { email: "nexhome911@gmail.com", password: "@nexhome" }; // Replace with your credentials
    if (email === user.email && password === user.password) {
      onLogin(user.email);
    } else {
      setErrorMessage("Invalid username or password");
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <div className="login-container">
          <div className="login-header">
            <img src={logo} alt="Nexhome Logo" className="login-logo" />
            <h1>Welcome Back</h1>
            <p>Sign in to continue to the Nexhome myMaps Tool</p>
          </div>
          
          <form className="login-form" onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}>
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            
            <button type="submit" className="login-button">
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;