import { createContext, useContext, useState, ReactNode } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

type ToastCtx = { notifyError: (m: string) => void; notifyOk: (m: string) => void; };
const Ctx = createContext<ToastCtx>({ notifyError: () => {}, notifyOk: () => {} });
let extNotifyError = (_: string) => {}; // for non-React files
let extNotifyOk = (_: string) => {};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [sev, setSev] = useState<'success' | 'error'>('success');
  const notify = (s: 'success'|'error', m: string) => { setSev(s); setMsg(m); setOpen(true); };
  const api = { notifyError: (m:string)=>notify('error',m), notifyOk:(m:string)=>notify('success',m) };
  extNotifyError = api.notifyError; extNotifyOk = api.notifyOk;

  return (
    <Ctx.Provider value={api}>
      {children}
      <Snackbar open={open} autoHideDuration={3500} onClose={()=>setOpen(false)} anchorOrigin={{vertical:'bottom',horizontal:'center'}}>
        <Alert severity={sev} variant="filled" sx={{ width: '100%' }}>{msg}</Alert>
      </Snackbar>
    </Ctx.Provider>
  );
}
export function useToast(){ return useContext(Ctx); }
export const notifyError = (m:string)=>extNotifyError(m);
export const notifyOk = (m:string)=>extNotifyOk(m);
