import React, { useState, useEffect } from 'react';
import {
  Container,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Box,
  Checkbox,
  IconButton,
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { validateIP } from './utils';
import { format, parseISO, addDays, startOfDay, endOfDay } from 'date-fns';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const barColors = ['#03AED2', '#FDDE55', '#1E88E5', '#FBC02D']; // Preset same-toned colors

const offset = 5; // Offset value in pixels

function App() {
  const [rows, setRows] = useState([]);
  const [earliest, setEarliest] = useState(null);
  const [latest, setLatest] = useState(null);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (rows.length > 0) {
      const dates = rows.flatMap((row) => [row.start, row.end]).filter(Boolean);
      if (dates.length > 0) {
        setEarliest(new Date(Math.min(...dates)));
        setLatest(new Date(Math.max(...dates)));
      }
    }
  }, [rows]);

  const handleAddRow = () => {
    setRows([
      ...rows,
      { name: '', ip: '', start: null, end: null, errors: { ip: '', date: '' }, selected: false },
    ]);
  };

  const handleChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;

    if (field === 'ip' && !validateIP(value)) {
      newRows[index].errors.ip = 'Invalid IP address';
    } else {
      newRows[index].errors.ip = '';
    }

    setRows(newRows);
  };

  const handleDeleteRow = (index) => {
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
  };

  const handleDeleteSelected = () => {
    const newRows = rows.filter((row) => !row.selected);
    setRows(newRows);
  };

  const handleCopySelected = () => {
    const selectedRows = rows.filter((row) => row.selected);
    const newRows = [...rows, ...selectedRows.map((row) => ({ ...row, selected: false }))];
    setRows(newRows);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const lines = e.target.result.split(/\r\n|\n/).filter(line => line.trim() !== '');
        const importedRows = lines.map((line) => {
          const [name, ip, start, end] = line.split('\t');
          return {
            name: name || '',
            ip: ip || '',
            start: start ? parseISO(start) : null,
            end: end ? parseISO(end) : null,
            errors: { ip: '', date: '' },
            selected: false
          };
        });
        setRows(importedRows);
      };
      reader.readAsText(file);
    }
  };

  const handleExport = () => {
    const content = rows
      .map((row) => {
        const startFormatted = row.start ? format(row.start, 'yyyy-MM-dd HH:mm:ss') : '';
        const endFormatted = row.end ? format(row.end, 'yyyy-MM-dd HH:mm:ss') : '';
        return `${row.name}\t${row.ip}\t${startFormatted}\t${endFormatted}`;
      })
      .join('\r\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'export.txt';
    link.click();
  };

  const calculateWidth = (start, end) => {
    if (!earliest || !latest || !start || !end) return 0;
    const totalDuration = latest - earliest;
    const rowDuration = end - start;
    return (rowDuration / totalDuration) * 100;
  };

  const calculateLeftPosition = (start) => {
    if (!earliest || !start) return offset; // If no earliest or start, return the offset directly
    const totalDuration = latest - earliest;
    const startDuration = start - earliest;
    const positionPercentage = (startDuration / totalDuration) * 100;
    
    return `calc(${positionPercentage}% + ${offset}px)`; // Adjust the position with the offset
  };

  const handleSelectAll = (event) => {
    const newRows = rows.map((row) => ({ ...row, selected: event.target.checked }));
    setRows(newRows);
    setSelectAll(event.target.checked);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const newRows = [...rows];
    const [reorderedRow] = newRows.splice(result.source.index, 1);
    newRows.splice(result.destination.index, 0, reorderedRow);

    setRows(newRows);
  };

  const renderBarSegments = (start, end) => {
    if (!start || !end) return null;
  
    if (start >= end) {
      return (
        <Box
          sx={{
            position: 'absolute',
            left: '0%',
            width: '100%',
            height: '20px',
            backgroundColor: 'red',
          }}
        />
      );
    }
  
    const segments = [];
    let currentStart = start;
    let currentEnd = endOfDay(start);
  
    while (currentEnd < end) {
      segments.push({ start: currentStart, end: currentEnd });
      currentStart = startOfDay(addDays(currentEnd, 1));
      currentEnd = endOfDay(currentStart);
    }
    segments.push({ start: currentStart, end });
  
    return segments.map((segment, index) => {
      const dayIndex = Math.floor((segment.start - startOfDay(earliest)) / (24 * 60 * 60 * 1000));
      const color = barColors[dayIndex % barColors.length];
  
      const isFirstSegment = segment.start.getTime() === start.getTime();
      const isLastSegment = segment.end.getTime() === end.getTime();
  
      return (
        <Box
          key={index}
          sx={{
            position: 'absolute',
            left: calculateLeftPosition(segment.start), // Use the updated function
            width: `${calculateWidth(segment.start, segment.end)}%`,
            height: '20px',
            backgroundColor: color,
          }}
        >
          {isFirstSegment && (
            <Box
              sx={{
                position: 'absolute',
                top: '-25px',
                left: 0,
                whiteSpace: 'nowrap',
                textAlign: 'center',
                fontSize: '9px',
              }}
            >
              <div>{format(segment.start, 'yyyy-MM-dd')}</div>
              <div>{format(segment.start, 'HH:mm')}</div>
            </Box>
          )}
          {isLastSegment && (
            <Box
              sx={{
                position: 'absolute',
                top: '-25px',
                right: 0,
                whiteSpace: 'nowrap',
                textAlign: 'center',
                fontSize: '9px',
              }}
            >
              <div>{format(segment.end, 'yyyy-MM-dd')}</div>
              <div>{format(segment.end, 'HH:mm')}</div>
            </Box>
          )}
        </Box>
      );
    });
  };
  

  return (
    <Container sx={{ width: '100%', minWidth: '100%', padding: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2, mb: 2 }}>
        <Button variant="contained" color="primary" onClick={handleAddRow}>
          Add Row
        </Button>
        <Button variant="contained" color="secondary" onClick={handleExport}>
          Export
        </Button>
        <input type="file" accept=".txt" onChange={handleImport} style={{ display: 'none' }} id="import-button" />
        <Button variant="contained" color="info" component="span">
        <label htmlFor="import-button">
          Import
        </label>
        </Button>
        <Button variant="contained" color="error" onClick={handleDeleteSelected}>
          Delete Selected
        </Button>
        <Button variant="contained" color="warning" onClick={handleCopySelected}>
          Copy Selected
        </Button>
      </Box>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="droppable">
            {(provided) => (
              <Table sx={{ minWidth: 650 }} {...provided.droppableProps} ref={provided.innerRef}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={rows.some((row) => row.selected) && rows.some((row) => !row.selected)}
                        checked={selectAll}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell align="center">Drag</TableCell>
                    <TableCell align="center">Name</TableCell>
                    <TableCell align="center">IP Address</TableCell>
                    <TableCell align="center">Start DateTime</TableCell>
                    <TableCell align="center">End DateTime</TableCell>
                    <TableCell align="center">Time Slot</TableCell>
                    <TableCell align="center"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => (
                    <Draggable key={index} draggableId={`row-${index}`} index={index}>
                      {(provided) => (
                        <TableRow ref={provided.innerRef} {...provided.draggableProps}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={!!row.selected}
                              onChange={(e) => handleChange(index, 'selected', e.target.checked)}
                            />
                          </TableCell>
                          <TableCell {...provided.dragHandleProps} sx={{ width: '19px'}} align="center">
                            <DragHandleIcon />
                          </TableCell>
                          <TableCell sx={{ width: '150px', padding: '4px' }} align="center">
                            <TextField
                              value={row.name || ''}
                              onChange={(e) => handleChange(index, 'name', e.target.value)}
                              error={!!row.errors.name}
                              helperText={row.errors.name}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell sx={{ width: '150px', padding: '4px' }} align="center">
                            <TextField
                              value={row.ip || ''}
                              onChange={(e) => handleChange(index, 'ip', e.target.value)}
                              error={!!row.errors.ip}
                              helperText={row.errors.ip}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell sx={{ width: '225px', padding: '4px' }} align="center">
                            <DateTimePicker
                              value={row.start || null}
                              onChange={(newValue) => handleChange(index, 'start', newValue)}
                              ampm={false}
                              renderInput={(props) => <TextField {...props} fullWidth />}
                              format='yyyy-MM-dd HH:mm'
                            />
                          </TableCell>
                          <TableCell sx={{ width: '225px', padding: '4px' }} align="center">
                            <DateTimePicker
                              value={row.end || null}
                              onChange={(newValue) => handleChange(index, 'end', newValue)}
                              ampm={false}
                              renderInput={(props) => <TextField {...props} fullWidth />}
                              format='yyyy-MM-dd HH:mm'
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ position: 'relative'}}>
                            {renderBarSegments(row.start, row.end)}
                          </TableCell>
                          <TableCell padding="checkbox" align="center">
                            <IconButton onClick={() => handleDeleteRow(index)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </TableBody>
              </Table>
            )}
          </Droppable>
        </DragDropContext>
      </LocalizationProvider>
    </Container>
  );
}

export default App;
