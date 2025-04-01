// src/components/Basket.js
import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton, TextField, Collapse } from '@mui/material';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

function Basket({ basket, updateBasketItem, updateBasketItemComment, removeBasketItem, saveOrder, isOrderAllowed }) {
  const [expanded, setExpanded] = useState(false);
  // Local state to track which item comments are open
  const [commentOpen, setCommentOpen] = useState({});

  // When the basket changes, ensure that items with an existing comment have their comment field open
  useEffect(() => {
    setCommentOpen(prev => {
      const newState = { ...prev };
      basket.forEach(item => {
        if (item.comment && item.comment.trim() !== '' && !newState[item.id]) {
          newState[item.id] = true;
        }
      });
      return newState;
    });
  }, [basket]);

  const toggleExpand = () => setExpanded(!expanded);
  const toggleComment = (id) => {
    setCommentOpen(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Calculate the total as a number and also as a formatted string
  const totalCostValue = basket.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalCost = totalCostValue.toFixed(2);

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'grey.300',
        p: 2,
        boxShadow: 3,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button onClick={toggleExpand} endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
          {expanded ? 'Masquer le panier' : 'Afficher le panier'}
        </Button>
        <Typography variant="body1">
          {basket.length} articles | Total : ${totalCost}
        </Typography>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ maxHeight: '50vh', overflowY: 'auto', mt: 2 }}>
          {basket.length === 0 ? (
            <Typography>Aucun article dans le panier</Typography>
          ) : (
            <>
              {[...basket]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((item) => {
                  const lineTotal = (item.price * item.quantity).toFixed(2);
                  return (
                    <Box key={item.id} sx={{ display: 'flex', flexDirection: 'column', mb: 1, gap: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Typography sx={{ flex: 2 }}>
                          {item.name} - ${parseFloat(item.price).toFixed(2)}
                        </Typography>
                        <Typography sx={{ width: '100px', textAlign: 'right' }}>
                          ${lineTotal}
                        </Typography>
                        <TextField
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateBasketItem(item.id, parseInt(e.target.value, 10))}
                          inputProps={{ min: 1 }}
                          size="small"
                          sx={{ width: '60px' }}
                        />
                        <IconButton onClick={() => removeBasketItem(item.id)}>
                          <RemoveCircleOutlineIcon />
                        </IconButton>
                        <Button variant="text" onClick={() => toggleComment(item.id)}>
                          {commentOpen[item.id] ? 'Masquer le commentaire' : 'Ajouter un commentaire'}
                        </Button>
                      </Box>
                      {commentOpen[item.id] && (
                        <TextField
                          label="Commentaire"
                          variant="outlined"
                          fullWidth
                          value={item.comment || ''}
                          onChange={(e) => updateBasketItemComment(item.id, e.target.value)}
                        />
                      )}
                    </Box>
                  );
                })}
            </>
          )}
        </Box>
        {/* New message if total cost is under $400 */}
        {basket.length > 0 && totalCostValue < 400 && (
          <Typography
            variant="caption"
            color="error"
            sx={{ mt: 1, display: 'block', fontSize: '1rem' }}
          >
            On n’est pas encore à 400$, c'est le minimum pour la livraison.
          </Typography>
        )}
        {basket.length > 0 && (
          <>
            {!isOrderAllowed && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                Les commandes ne peuvent être passées que du lundi au mercredi.
              </Typography>
            )}
          </>
        )}
      </Collapse>
    </Box>
  );
}

export default Basket;
