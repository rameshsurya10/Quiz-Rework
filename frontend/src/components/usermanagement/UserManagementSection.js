import React, { useState, useEffect, useMemo } from 'react';
import FullLayout from '../FullLayout';
import {
  Container, Box, Typography, Button, Paper, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel, IconButton,
  useTheme, alpha, TextField, Grid, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { PageHeader, EmptyState } from '../common';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import { motion } from 'framer-motion';
import { visuallyHidden } from '@mui/utils';
import CreateUserDialog from './CreateUserDialog';
import ConfirmationDialog from '../ConfirmationDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { userApi } from '../../services/api';

const mockUsersData = [
  { id: 'u1', name: 'Alice Wonderland', email: 'alice@example.com', role: 'Student', joinedDate: '2023-09-01', status: 'Active' },
  { id: 'u2', name: 'Bob The Builder', email: 'bob@example.com', role: 'Teacher', joinedDate: '2022-08-15', status: 'Active' },
  { id: 'u3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'Student', joinedDate: '2023-10-05', status: 'Inactive' },
  { id: 'u4', name: 'Diana Prince', email: 'diana@example.com', role: 'Admin', joinedDate: '2021-01-20', status: 'Active' },
  { id: 'u5', name: 'Edward Scissorhands', email: 'edward@example.com', role: 'Teacher', joinedDate: '2023-03-10', status: 'Active' },
  { id: 'u6', name: 'Fiona Gallagher', email: 'fiona@example.com', role: 'Student', joinedDate: '2024-01-15', status: 'Active' },
  { id: 'u7', name: 'George Jetson', email: 'george@example.com', role: 'Teacher', joinedDate: '2022-11-30', status: 'Inactive' },
];

const UserManagementSection = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  
  // Dialog state
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Confirmation Dialog state for delete user
  const [openConfirmDeleteUserDialog, setOpenConfirmDeleteUserDialog] = useState(false);
  const [userToDeleteId, setUserToDeleteId] = useState(null);

  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');

  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // API and saving state
  const [isSavingUser, setIsSavingUser] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const response = await userApi.getAll();
        setUsers(response.data || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        showSnackbar('Failed to load users. Please try again.', 'error');
        setUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when search changes
  };

  const handleFilterRoleChange = (event) => {
    setFilterRole(event.target.value);
    setPage(0);
  };

  const handleFilterStatusChange = (event) => {
    setFilterStatus(event.target.value);
    setPage(0);
  };

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  function descendingComparator(a, b, orderByProperty) {
    if (b[orderByProperty] < a[orderByProperty]) return -1;
    if (b[orderByProperty] > a[orderByProperty]) return 1;
    return 0;
  }

  function getComparator(currentOrder, orderByProperty) {
    return currentOrder === 'desc'
      ? (a, b) => descendingComparator(a, b, orderByProperty)
      : (a, b) => -descendingComparator(a, b, orderByProperty);
  }

  const filteredUsers = useMemo(() => {
    let tempUsers = [...users]; // Use the full users list from state

    if (searchTerm) {
      tempUsers = tempUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole !== 'All') {
      tempUsers = tempUsers.filter(user => user.role === filterRole);
    }

    if (filterStatus !== 'All') {
      tempUsers = tempUsers.filter(user => user.status === filterStatus);
    }
    return tempUsers;
  }, [users, searchTerm, filterRole, filterStatus]);

  const sortedAndFilteredUsers = useMemo(() => {
    return [...filteredUsers].sort(getComparator(order, orderBy));
  }, [filteredUsers, order, orderBy]);

  const visibleUsers = useMemo(() => {
    return sortedAndFilteredUsers.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [sortedAndFilteredUsers, page, rowsPerPage]);

  const tableHeadCells = [
    { id: 'name', numeric: false, label: 'Name' },
    { id: 'email', numeric: false, label: 'Email' },
    { id: 'role', numeric: false, label: 'Role' },
    { id: 'joinedDate', numeric: false, label: 'Joined Date' },
    { id: 'status', numeric: false, label: 'Status' },
    { id: 'actions', numeric: true, label: 'Actions', sortDisabled: true },
  ];

  const handleOpenAddUserDialog = () => {
    setEditingUser(null);
    setIsEditingUser(false);
    setOpenUserDialog(true);
  };

  const handleOpenEditUserDialog = (user) => {
    setEditingUser(user);
    setIsEditingUser(true);
    setOpenUserDialog(true);
  };

  const handleCloseUserDialog = () => {
    setOpenUserDialog(false);
    setEditingUser(null);
    setIsEditingUser(false);
  };

  const handleSaveUser = async (formData, userId) => {
    setIsSavingUser(true);
    // The status from formData is a boolean, convert to 'Active'/'Inactive' for backend if needed
    // Or expect backend to handle boolean. For now, let's assume backend expects 'Active'/'Inactive'
    // The CreateUserDialog already sends status as boolean, so we adjust here or in dialog.
    // Let's assume the API expects the same structure as it returns for simplicity or that CreateUserDialog handles it.
    // For now, we'll pass formData as is, assuming it matches API expectations or API is flexible.

    // If your API expects 'status' as 'Active'/'Inactive' string from boolean:
    const apiData = { ...formData, status: formData.status ? 'Active' : 'Inactive' };

    try {
      if (userId) { // Editing existing user
        const response = await userApi.update(userId, apiData);
        setUsers(prevUsers => 
          prevUsers.map(u => (u.id === userId ? { ...u, ...response.data } : u))
        );
        showSnackbar(`User ${userId ? 'updated' : 'created'} successfully!`, 'success');
      } else { // Creating new user
        const response = await userApi.create(apiData);
        setUsers(prevUsers => [response.data, ...prevUsers]);
        showSnackbar('User created successfully!', 'success');
      }
      handleCloseUserDialog(); // Close dialog on successful save
    } catch (error) {
      console.error(`Failed to ${userId ? 'update' : 'create'} user:`, error);
      const errorMessage = error.response?.data?.detail || error.message || 'An unexpected error occurred.';
      showSnackbar(`Failed to ${userId ? 'update' : 'create'} user: ${errorMessage}`, 'error');
      // Keep dialog open if error
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleOpenConfirmDeleteDialog = (userId) => {
    setUserToDeleteId(userId);
    setOpenConfirmDeleteUserDialog(true);
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    setIsSavingUser(true); // Reuse for loading state
    try {
      // Assuming toggleStatus API expects { status: 'Active' or 'Inactive' }
      const response = await userApi.toggleStatus(userId);
      const updatedUser = response.data;
      setUsers(prevUsers => prevUsers.map(u => (u.id === userId ? updatedUser : u)));
      showSnackbar(`User status changed to ${updatedUser.status}!`, 'success');
    } catch (error) {
      console.error('Failed to change user status:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'An unexpected error occurred.';
      showSnackbar(`Failed to change user status: ${errorMessage}`, 'error');
    } finally {
      setIsSavingUser(false);
    }
  };

  const executeDeleteUser = async () => {
    if (!userToDeleteId) return;
    setIsSavingUser(true); // Reuse for loading state during delete
    try {
      await userApi.delete(userToDeleteId);
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDeleteId));
      showSnackbar('User deleted successfully!', 'success');
    } catch (error) {
      console.error('Failed to delete user:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'An unexpected error occurred.';
      showSnackbar(`Failed to delete user: ${errorMessage}`, 'error');
    } finally {
      setIsSavingUser(false);
      handleCloseConfirmDeleteUserDialog();
    }
  };

  const handleCloseConfirmDeleteUserDialog = () => {
    setOpenConfirmDeleteUserDialog(false);
    setUserToDeleteId(null);
  };

  const getStatusChip = (status) => {
    return (
      <Chip 
        label={status}
        color={status === 'Active' ? 'success' : 'error'}
        size="small"
        sx={{ fontWeight: 'medium' }}
      />
    );
  }

  return (
    <FullLayout>
      <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
        <PageHeader
          title="User Management"
          subtitle="Manage all registered users, their roles, and account status."
          actions={[
            <Button key="add-user" variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddUserDialog}>
              Add New User
            </Button>,
          ]}
        />

        {isLoadingUsers ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><Typography>Loading users...</Typography></Box>
        ) : users.length === 0 ? (
          <EmptyState 
            title="No Users Found"
            description="There are currently no users in the system. Start by adding a new user."
            icon={<GroupIcon />}
            actionButton={(
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddUserDialog}>
                Add First User
              </Button>
            )}
          />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden', mt: 3, borderRadius: '12px', boxShadow: theme.shadows[2] }}>
              <TableContainer>
                <Table sx={{ minWidth: 750 }} aria-labelledby="userTableTitle">
                  <TableHead sx={{ backgroundColor: alpha(theme.palette.primary.light, 0.1) }}>
                    <TableRow>
                      {tableHeadCells.map((headCell) => (
                        <TableCell
                          key={headCell.id}
                          align={headCell.numeric ? 'right' : 'left'}
                          sortDirection={orderBy === headCell.id ? order : false}
                        >
                          {headCell.sortDisabled ? headCell.label : (
                            <TableSortLabel
                              active={orderBy === headCell.id}
                              direction={orderBy === headCell.id ? order : 'asc'}
                              onClick={(event) => handleRequestSort(event, headCell.id)}
                            >
                              {headCell.label}
                              {orderBy === headCell.id ? (
                                <Box component="span" sx={visuallyHidden}>
                                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                </Box>
                              ) : null}
                            </TableSortLabel>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleUsers.map((user) => (
                      <TableRow hover tabIndex={-1} key={user.id}>
                        <TableCell component="th" scope="row">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>{new Date(user.joinedDate).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusChip(user.status)}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => console.log('View user:', user.id)} title="View Details">
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleOpenEditUserDialog(user)} title="Edit User">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          {user.status === 'Active' ? (
                            <IconButton size="small" onClick={() => handleToggleUserStatus(user.id, user.status)} title="Deactivate User">
                              <PersonOffIcon fontSize="small" color="warning" />
                            </IconButton>
                          ) : (
                            <IconButton size="small" onClick={() => handleToggleUserStatus(user.id, user.status)} title="Activate User">
                              <PersonIcon fontSize="small" color="success" />
                            </IconButton>
                          )}
                          <IconButton size="small" onClick={() => handleOpenConfirmDeleteDialog(user.id)} title="Delete User">
                            <DeleteIcon fontSize="small" color="error" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {visibleUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={tableHeadCells.length} align="center">
                          No users match your current filters/search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={sortedAndFilteredUsers.length} // Count should be based on filtered list
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Paper>
          </motion.div>
        )}
        <CreateUserDialog 
          open={openUserDialog}
          onClose={handleCloseUserDialog}
          onSave={handleSaveUser}
          initialData={editingUser}
          isEditing={isEditingUser}
          isSaving={isSavingUser} // Pass isSavingUser state
        />

        <ConfirmationDialog
          open={openConfirmDeleteUserDialog}
          onClose={handleCloseConfirmDeleteUserDialog}
          onConfirm={executeDeleteUser}
          title="Confirm User Deletion"
          message={`Are you sure you want to delete this user? This action cannot be undone and will remove all their associated data.`}
          confirmText="Delete User"
          confirmButtonColor="error"
        />
      </Container>
    </FullLayout>
  );
};

export default UserManagementSection;
