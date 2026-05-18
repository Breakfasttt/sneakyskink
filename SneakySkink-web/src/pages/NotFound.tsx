import React from 'react';
import { Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ textAlign: 'center', mt: 10 }}>
      <Typography variant="h1" color="primary">404</Typography>
      <Typography variant="h5" sx={{ mb: 4 }}>Oups ! Cette page s'est perdue dans le Warp.</Typography>
      <Button variant="contained" onClick={() => navigate('/')}>Retour à l'accueil</Button>
    </Box>
  );
};

export default NotFound;
