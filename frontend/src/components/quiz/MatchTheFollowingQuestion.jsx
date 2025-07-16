import React, { useState, useCallback } from 'react';
import { Box, Typography, Paper, Avatar, Chip, Grid } from '@mui/material';
import { useDrag, useDrop } from 'react-dnd';

const ITEM_TYPE = 'MATCH_ITEM';

// Utility to get display label
function getDisplayLabel(label) {
  if (typeof label === 'object' && label !== null) {
    return label.option_text || label.label || JSON.stringify(label);
  }
  return label;
}

// Draggable left item
function DraggableLeft({ item, isMatched, onDrag }) {
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { id: item.id },
    // Allow dragging even if matched
    canDrag: true,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    end: onDrag,
  });
  return (
    <Paper
      ref={drag}
      sx={{
        p: 1,
        mb: 2,
        opacity: isDragging ? 0.5 : 1,
        background: isMatched ? 'success.light' : 'background.paper',
        border: isMatched ? '2px solid #4caf50' : '1px solid #ccc',
        display: 'flex',
        alignItems: 'center',
        cursor: 'grab',
        minWidth: 120,
        gap: 1,
      }}
      aria-disabled={false}
    >
      {item.image && <Avatar src={item.image} alt={getDisplayLabel(item.label)} sx={{ mr: 1 }} />}
      <Typography variant="subtitle1">{getDisplayLabel(item.label)}</Typography>
    </Paper>
  );
}

// Droppable right item
function DroppableRight({ item, onDrop, isMatched, matchedLabel }) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPE,
    drop: (dragged) => onDrop(dragged.id, item.id),
    canDrop: () => true, // Always allow drop
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });
  return (
    <Paper
      ref={drop}
      sx={{
        p: 1,
        mb: 2,
        minWidth: 120,
        minHeight: 48,
        background: isMatched ? 'success.light' : isOver && canDrop ? 'primary.light' : 'background.paper',
        border: isMatched ? '2px solid #4caf50' : isOver && canDrop ? '2px dashed #1976d2' : '1px solid #ccc',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        position: 'relative',
      }}
    >
      {item.image && <Avatar src={item.image} alt={getDisplayLabel(item.label)} sx={{ mr: 1 }} />}
      <Typography variant="subtitle1">{getDisplayLabel(item.label)}</Typography>
      {isMatched && (
        <Chip
          label={matchedLabel}
          size="small"
          color="success"
          sx={{ position: 'absolute', right: 8, top: 8 }}
        />
      )}
    </Paper>
  );
}

const MatchTheFollowingQuestion = ({
  leftItems = [],
  rightItems = [],
  onMatch,
  initialMatches = {},
}) => {
  // matches: { leftId: rightId }
  const [matches, setMatches] = useState(initialMatches);

  // Reverse lookup for rightId -> leftId
  const rightToLeft = {};
  Object.entries(matches).forEach(([left, right]) => {
    rightToLeft[right] = left;
  });

  const handleDrop = useCallback((leftId, rightId) => {
    // Remove any previous match for this rightId
    const updated = { ...matches };
    // Remove any left that was previously matched to this rightId
    Object.keys(updated).forEach((l) => {
      if (updated[l] === rightId) {
        delete updated[l];
      }
    });
    // Remove any previous right for this leftId
    updated[leftId] = rightId;
    setMatches(updated);
    if (onMatch) onMatch(updated);
  }, [matches, onMatch]);

  return (
    <Box sx={{ width: '100%', maxWidth: 500, mx: 'auto', mt: 2 }}>
      <Typography variant="h6" align="center" sx={{ mb: 2 }}>
        Match the items by dragging from left to right
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          {leftItems.map((item) => (
            <DraggableLeft
              key={item.id}
              item={item}
              isMatched={!!matches[item.id]}
              onDrag={() => {}}
            />
          ))}
        </Grid>
        <Grid item xs={6}>
          {rightItems.map((item) => (
            <DroppableRight
              key={item.id}
              item={item}
              isMatched={!!rightToLeft[item.id]}
              matchedLabel={rightToLeft[item.id] ? getDisplayLabel(leftItems.find(l => l.id === rightToLeft[item.id])?.label) : ''}
              onDrop={handleDrop}
            />
          ))}
        </Grid>
      </Grid>
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Current Matches:</Typography>
        {Object.entries(matches).length === 0 ? (
          <Typography color="text.secondary">No matches yet.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(matches).map(([leftId, rightId]) => {
              const left = leftItems.find(l => l.id === leftId);
              const right = rightItems.find(r => r.id === rightId);
              return (
                <Chip
                  key={leftId}
                  label={`${getDisplayLabel(left?.label)} → ${getDisplayLabel(right?.label)}`}
                  color="primary"
                  sx={{ fontWeight: 500 }}
                />
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MatchTheFollowingQuestion; 