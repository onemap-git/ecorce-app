// src/components/Basket.js
import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton, TextField, Collapse, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { usePricing } from '../contexts/PricingContext';
import { formatPrice } from '../utils/formatPrice';

function Basket({ basket, updateBasketItem, updateBasketItemComment, removeBasketItem, saveOrder, isOrderAllowed }) {
  const [expanded, setExpanded] = useState(false);
  const [commentOpen, setCommentOpen] = useState({});
  const { getFinalPrice } = usePricing();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

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

  // Compute total cost using the final (margin-adjusted) price
  const totalCostValue = basket.reduce((acc, item) => {
    const finalPrice = getFinalPrice(item.price);
    return acc + finalPrice * item.quantity;
  }, 0);
  const totalCost = totalCostValue.toFixed(2);

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: {
          xs: 0,
          lg: 'auto'
        },
        left: {
          xs: 0,
          lg: 'auto'
        },
        right: 0,
        top: {
          xs: 'auto',
          lg: 0
        },
        width: {
          xs: '100%',
          lg: '450px'
        },
        height: {
          xs: 'auto',
          lg: '100vh'
        },
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
        borderTop: {
          xs: '1px solid',
          lg: 'none'
        },
        borderLeft: {
          xs: 'none',
          lg: '1px solid'
        },
        borderColor: 'grey.300',
        p: 2,
        boxShadow: 3,
        zIndex: 1100,
        overflowY: {
          xs: 'auto',
          lg: 'auto'
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
          <Button onClick={toggleExpand} endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
            {expanded ? 'Masquer le panier' : 'Afficher le panier'}
          </Button>
        </Box>
        <Typography variant="body1" sx={{ ml: { lg: 'auto' } }}>
          {basket.length} articles | Total : ${totalCost}
        </Typography>
      </Box>
      <Collapse in={expanded || isDesktop}>
        <Box sx={{ maxHeight: { xs: '50vh', lg: 'calc(100vh - 120px)' }, overflowY: 'auto', mt: 2 }}>
          {basket.length === 0 ? (
            <Typography>Aucun article dans le panier</Typography>
          ) : (
            <>
              {[...basket]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((item) => {
                  const finalPrice = getFinalPrice(item.price);
                  const formattedPrice = formatPrice(finalPrice);
                  const lineTotal = (finalPrice * item.quantity).toFixed(2);
                  return (
                    <Box key={item.id} sx={{ display: 'flex', flexDirection: 'column', mb: 1, gap: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          flexWrap: 'wrap',
                          position: 'relative',
                          paddingRight: { lg: '40px' }
                        }}
                      >
                        <Typography sx={{ flex: 2 }}>
                          {item.name} - ${formattedPrice}
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
                        <Button 
                          variant="text" 
                          onClick={() => toggleComment(item.id)}
                          sx={{ 
                            marginRight: { xs: 0, lg: '40px' }
                          }}
                        >
                          {commentOpen[item.id] ? 'Masquer le commentaire' : 'Ajouter un commentaire'}
                        </Button>
                        <IconButton 
                          onClick={() => removeBasketItem(item.id)}
                          sx={{ 
                            position: { xs: 'static', lg: 'absolute' }, 
                            right: { lg: 0 },
                            top: { lg: '50%' },
                            transform: { lg: 'translateY(-50%)' }
                          }}
                        >
                          <RemoveCircleOutlineIcon />
                        </IconButton>
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
