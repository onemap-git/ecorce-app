import React, { useState, useEffect } from 'react';
import { isSignInWithEmailLink, signInWithEmailLink, sendSignInLinkToEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useLocation } from 'react-router-dom';
import { Container, Typography, TextField, Button, Box, Alert } from '@mui/material';

function Login() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const location = useLocation();

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let storedEmail = window.localStorage.getItem('emailForSignIn');
      if (!storedEmail) {
        storedEmail = window.prompt('Please provide your email for confirmation');
      }
      signInWithEmailLink(auth, storedEmail, window.location.href)
        .then(() => {
          window.localStorage.removeItem('emailForSignIn');
        })
        .catch(error => {
          console.error(error);
        });
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setMessage('Login link sent to your email!');
    } catch (error) {
      console.error(error);
      setMessage('Error sending email link');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, p: 4, boxShadow: 3, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Login
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            variant="outlined"
            margin="normal"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Button variant="contained" color="primary" type="submit" fullWidth>
            Send Login Link
          </Button>
        </form>
        {message && <Alert severity="info" sx={{ mt: 2 }}>{message}</Alert>}
      </Box>
    </Container>
  );
}

export default Login;
