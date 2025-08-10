// src/components/common/PageLoader.tsx
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
export default function PageLoader(){
  return (
    <Box sx={{ width:'100%', pt: 0.5 }}>
      <LinearProgress />
    </Box>
  );
}
