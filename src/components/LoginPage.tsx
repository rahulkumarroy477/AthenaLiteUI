import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { signIn, signUp, confirmSignUp } from 'aws-amplify/auth';

interface LoginPageProps {
  onLogin: (email: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | 'confirm'>('signin');
  const [confirmCode, setConfirmCode] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields'); return; }

    setIsLoading(true);
    try {
      const result = await signIn({ username: email, password });
      if (result.isSignedIn) onLogin(email);
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields'); return; }

    setIsLoading(true);
    try {
      await signUp({ username: email, password, options: { userAttributes: { email } } });
      setMode('confirm');
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: confirmCode });
      const result = await signIn({ username: email, password });
      if (result.isSignedIn) onLogin(email);
    } catch (err: any) {
      setError(err.message || 'Confirmation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0a]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/20">
            <Database className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {mode === 'confirm' ? 'Verify Email' : 'Welcome back'}
          </h1>
          <p className="text-neutral-400">
            {mode === 'confirm' ? 'Check your email for a verification code' : mode === 'signup' ? 'Create your AthenaLite account' : 'Sign in to your AthenaLite account'}
          </p>
        </div>

        <div className="bg-[#0d0d0d] border border-neutral-800 rounded-2xl p-8 shadow-2xl">
          {mode === 'confirm' ? (
            <form onSubmit={handleConfirm} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Verification Code</label>
                <input
                  type="text"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  placeholder="Enter code"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>
              {error && <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-500 font-medium text-center">{error}</motion.p>}
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center transition-all group">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-blue-500 transition-colors" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-blue-500 transition-colors" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" />
                </div>
              </div>
              {error && <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-500 font-medium text-center">{error}</motion.p>}
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center transition-all group">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{mode === 'signin' ? 'Sign In' : 'Create Account'}<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></>}
              </button>
            </form>
          )}

          {mode !== 'confirm' && (
            <div className="mt-8 pt-6 border-t border-neutral-800 text-center">
              <p className="text-sm text-neutral-500">
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }} className="text-blue-500 hover:text-blue-400 font-medium">
                  {mode === 'signin' ? 'Create one for free' : 'Sign in'}
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-[10px] text-neutral-600 uppercase tracking-widest">
          Secure Serverless Infrastructure • AWS Cognito
        </p>
      </motion.div>
    </div>
  );
}
