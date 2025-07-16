import React from "react";
import { Typography, Table, TableBody, TableCell, TableRow, TableHead, Paper } from "@mui/material";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const MatchTheFollowingPreview = ({ question }) => {
  const leftLabels = question.column_left_labels || {};
  const rightLabels = question.column_right_labels || {};
  const correctAnswer = question.correct_answer || {};

  // Convert to arrays for rendering
  const leftItems = Object.entries(leftLabels); // [ [A, "Oxidation"], ... ]
  const rightItems = Object.entries(rightLabels); // [ [1, "Gain of oxygen"], ... ]

  // Helper: find right key by value
  const getRightKeyByValue = (value) =>
    rightItems.find(([key, val]) => val === value)?.[0] || "";

  // Build matched pairs for display
  const matchedPairs = leftItems.map(([leftKey, leftVal]) => {
    const rightVal = correctAnswer[leftVal];
    const rightKey = getRightKeyByValue(rightVal);
    return { leftKey, leftVal, rightKey, rightVal };
  });

  return (
    <Paper elevation={2} sx={{ borderRadius: 2, p: 2, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
        {question.question}
      </Typography>
      <Table size="small" sx={{ mb: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell align="center" sx={{ fontWeight: 700 }}>Column A</TableCell>
            <TableCell align="center"></TableCell>
            <TableCell align="center" sx={{ fontWeight: 700 }}>Column B</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {matchedPairs.map(({ leftKey, leftVal, rightKey, rightVal }) => (
            <TableRow key={leftKey}>
              <TableCell align="right" sx={{ fontWeight: 500 }}>
                {leftKey}. {leftVal}
              </TableCell>
              <TableCell align="center">
                <ArrowForwardIcon color="primary" />
              </TableCell>
              <TableCell align="left" sx={{ fontWeight: 500 }}>
                <span style={{ color: '#2e7d32', fontWeight: 600 }}>
                  {rightKey}. {rightVal}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default MatchTheFollowingPreview; 