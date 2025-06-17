# Teacher Management Module

This module provides a comprehensive interface for managing teachers in the Quiz Application.

## Features

- View list of teachers with details (name, email, department, etc.)
- Add new teachers with validation
- View teacher statistics (quiz created, published, etc.)
- Responsive design that works on all screen sizes
- Smooth animations and transitions
- Integration with backend API

## Components

### TeacherSection.js

The main component that renders the teacher management interface.

#### Props

- `initialOpenDialog` (Boolean, optional): If true, the add teacher dialog will be open by default

#### State

- `teachers`: Array of teacher objects
- `departments`: Array of department objects
- `isLoading`: Boolean indicating if data is being loaded
- `openDialog`: Boolean to control add teacher dialog visibility
- `snackbar`: Object containing snackbar state and message
- `formData`: Object containing form data for adding a new teacher

## API Integration

The component integrates with the following API endpoints:

- `GET /api/accounts/teachers/` - Fetch all teachers
- `POST /api/accounts/teachers/` - Add a new teacher
- `GET /api/departments/` - Fetch all departments

## Styling

The component uses Material-UI's styling system with the following customizations:

- Custom card styling with hover effects
- Responsive grid layout
- Themed colors and typography
- Smooth animations using Framer Motion

## Usage

```jsx
import TeacherSection from './components/teachers';

// In your component:
<TeacherSection initialOpenDialog={false} />
```

## Responsive Behavior

- On large screens: 4 stats cards in a row, 3-4 teacher cards per row
- On medium screens: 2 stats cards per row, 2 teacher cards per row
- On small screens: 1 stat card per row, 1 teacher card per row

## Dependencies

- @mui/material
- @mui/icons-material
- @emotion/react
- @emotion/styled
- framer-motion
- react-router-dom
