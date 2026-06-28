import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';

import { authApi } from '@/lib/auth.api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { loginSchema, setPasswordSchema } from './login/schemas';
import type { LoginFormData, SetPasswordFormData, Etape } from './login/schemas';
import { slideVariants, slideTx, fadeUp } from './login/animations';
import {
  GridPattern,
  StepTab,
  ModeTab,
  FormField,
  EyeToggle,
  ServerError,
  PasswordStrength,
} from './login/components';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [etape, setEtape] = useState<Etape>('login');
  const [direction, setDirection] = useState(1);
  const [premiereConnexion, setPremiereConnexion] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const matriculeId = useId();
  const otpId = useId();
  const motDePasseId = useId();
  const newPassId = useId();
  const confirmId = useId();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { mode: 'password', matricule: '', motDePasse: '', otp: '' },
  });

  const passwordForm = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { motDePasse: '', confirmation: '' },
    mode: 'onChange',
  });

  const watchedPassword = passwordForm.watch('motDePasse');

  function toggleMode(firstLogin: boolean) {
    setPremiereConnexion(firstLogin);
    setServerError(null);
    loginForm.clearErrors();
    loginForm.reset({
      mode: firstLogin ? 'otp' : 'password',
      matricule: loginForm.getValues('matricule'),
      motDePasse: '',
      otp: '',
    });
  }

  async function onLoginSubmit(data: LoginFormData) {
    setServerError(null);
    try {
      const res = await authApi.login(
        data.matricule,
        data.mode === 'otp' ? data.otp : undefined,
        data.mode === 'password' ? data.motDePasse : undefined
      );
      if (res.data.premiereConnexion) {
        setDirection(1);
        setEtape('set-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      setServerError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Identifiants invalides. Veuillez réessayer.'
      );
    }
  }

  async function onSetPasswordSubmit(data: SetPasswordFormData) {
    setServerError(null);
    try {
      await authApi.setPassword(data.motDePasse, data.confirmation);
      navigate('/dashboard');
    } catch (err: unknown) {
      setServerError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la définition du mot de passe.'
      );
    }
  }

  function backToLogin() {
    setDirection(-1);
    setEtape('login');
    setServerError(null);
    passwordForm.reset();
  }

  return (
    <div className="min-h-dvh bg-anac-gray flex items-center justify-center p-4 relative overflow-hidden">
      <GridPattern />

      <motion.div
        className="w-full max-w-[420px] relative z-10"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Logo */}
        <div className="text-center mb-7">
          <motion.div
            className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-anac-navy shadow-lg mb-4 relative overflow-hidden"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-anac-blue/40 to-transparent" />
            <ShieldCheck className="text-white relative z-10" size={24} strokeWidth={1.75} />
          </motion.div>
          <h1 className="text-xl font-bold text-anac-navy tracking-tight">SICOT</h1>
          <p className="text-anac-muted text-[11px] mt-0.5 leading-relaxed">
            Système Intégré de Coopération Internationale et de Traduction
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-anac-border overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-anac-navy via-anac-blue to-anac-sky" />

          <div className="flex border-b border-anac-border">
            <StepTab active={etape === 'login'} completed={etape === 'set-password'} step={1} label="Connexion" />
            <div className="w-px bg-anac-border" />
            <StepTab active={etape === 'set-password'} completed={false} step={2} label="Mot de passe" />
          </div>

          <div className="p-6 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              {etape === 'login' && (
                <motion.div
                  key="login"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTx}
                >
                  <LoginStep
                    t={t}
                    loginForm={loginForm}
                    premiereConnexion={premiereConnexion}
                    serverError={serverError}
                    showPassword={showPassword}
                    matriculeId={matriculeId}
                    otpId={otpId}
                    motDePasseId={motDePasseId}
                    onToggleMode={toggleMode}
                    onTogglePassword={() => setShowPassword((v) => !v)}
                    onSubmit={onLoginSubmit}
                  />
                </motion.div>
              )}

              {etape === 'set-password' && (
                <motion.div
                  key="set-password"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTx}
                >
                  <SetPasswordStep
                    t={t}
                    passwordForm={passwordForm}
                    watchedPassword={watchedPassword}
                    serverError={serverError}
                    showNew={showNew}
                    showConfirm={showConfirm}
                    newPassId={newPassId}
                    confirmId={confirmId}
                    onToggleNew={() => setShowNew((v) => !v)}
                    onToggleConfirm={() => setShowConfirm((v) => !v)}
                    onSubmit={onSetPasswordSubmit}
                    onBack={backToLogin}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-anac-muted text-[10px] mt-4 tracking-wide uppercase">
          ANAC Gabon — Usage interne uniquement
        </p>
      </motion.div>
    </div>
  );
}

// ── Step sub-views ────────────────────────────────────────────────────────

interface LoginStepProps {
  t: (key: string) => string;
  loginForm: ReturnType<typeof useForm<LoginFormData>>;
  premiereConnexion: boolean;
  serverError: string | null;
  showPassword: boolean;
  matriculeId: string;
  otpId: string;
  motDePasseId: string;
  onToggleMode: (firstLogin: boolean) => void;
  onTogglePassword: () => void;
  onSubmit: (data: LoginFormData) => Promise<void>;
}

function LoginStep({
  t,
  loginForm,
  premiereConnexion,
  serverError,
  showPassword,
  matriculeId,
  otpId,
  motDePasseId,
  onToggleMode,
  onTogglePassword,
  onSubmit,
}: LoginStepProps) {
  const errors = loginForm.formState.errors;

  return (
    <>
      <p className="text-[13px] font-semibold text-anac-navy mb-5">{t('auth.title')}</p>

      <form onSubmit={loginForm.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField id={matriculeId} label={t('auth.matricule')} error={errors.matricule?.message}>
          <Input
            id={matriculeId}
            {...loginForm.register('matricule')}
            placeholder="Ex : AG-2024-001"
            autoFocus
            autoComplete="username"
            spellCheck={false}
            aria-invalid={!!errors.matricule}
            className={errorCls(!!errors.matricule)}
          />
        </FormField>

        <div
          className="grid grid-cols-2 rounded-lg border border-anac-border overflow-hidden"
          role="group"
          aria-label="Mode de connexion"
        >
          <ModeTab active={!premiereConnexion} onClick={() => onToggleMode(false)} label="Mot de passe" />
          <ModeTab active={premiereConnexion} onClick={() => onToggleMode(true)} label="Première connexion (OTP)" />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {premiereConnexion ? (
            <motion.div
              key="otp"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FormField
                id={otpId}
                label={t('auth.otp')}
                hint="Code à 6 chiffres reçu par e-mail"
                error={
                  'otp' in errors
                    ? (errors as { otp?: { message?: string } }).otp?.message
                    : undefined
                }
              >
                <Input
                  id={otpId}
                  {...loginForm.register('otp')}
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="one-time-code"
                  aria-invalid={'otp' in errors && !!(errors as { otp?: unknown }).otp}
                  className={cn(
                    errorCls('otp' in errors && !!(errors as { otp?: unknown }).otp),
                    'tracking-[0.4em] text-center text-base font-bold'
                  )}
                  onChange={(e) =>
                    loginForm.setValue('otp', e.target.value.replace(/\D/g, '').slice(0, 6), {
                      shouldValidate: true,
                    })
                  }
                />
              </FormField>
            </motion.div>
          ) : (
            <motion.div
              key="mdp"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FormField
                id={motDePasseId}
                label={t('auth.motDePasse')}
                error={
                  'motDePasse' in errors
                    ? (errors as { motDePasse?: { message?: string } }).motDePasse?.message
                    : undefined
                }
              >
                <div className="relative">
                  <Input
                    id={motDePasseId}
                    {...loginForm.register('motDePasse')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    aria-invalid={
                      'motDePasse' in errors && !!(errors as { motDePasse?: unknown }).motDePasse
                    }
                    className={cn(
                      errorCls(
                        'motDePasse' in errors && !!(errors as { motDePasse?: unknown }).motDePasse
                      ),
                      'pr-10'
                    )}
                  />
                  <EyeToggle show={showPassword} onToggle={onTogglePassword} />
                </div>
              </FormField>
            </motion.div>
          )}
        </AnimatePresence>

        <ServerError message={serverError} />

        <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
          {loginForm.formState.isSubmitting ? (
            <><Loader2 size={14} className="animate-spin" />{t('common.loading')}</>
          ) : (
            t('auth.connexion')
          )}
        </Button>
      </form>
    </>
  );
}

interface SetPasswordStepProps {
  t: (key: string) => string;
  passwordForm: ReturnType<typeof useForm<SetPasswordFormData>>;
  watchedPassword: string;
  serverError: string | null;
  showNew: boolean;
  showConfirm: boolean;
  newPassId: string;
  confirmId: string;
  onToggleNew: () => void;
  onToggleConfirm: () => void;
  onSubmit: (data: SetPasswordFormData) => Promise<void>;
  onBack: () => void;
}

function SetPasswordStep({
  t,
  passwordForm,
  watchedPassword,
  serverError,
  showNew,
  showConfirm,
  newPassId,
  confirmId,
  onToggleNew,
  onToggleConfirm,
  onSubmit,
  onBack,
}: SetPasswordStepProps) {
  const errors = passwordForm.formState;

  return (
    <>
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-3 mb-5">
        <ShieldCheck size={14} className="text-blue-600 mt-0.5 shrink-0" />
        <p className="text-blue-800 text-[11px] leading-relaxed">{t('auth.premiereConnexion')}</p>
      </div>

      <form onSubmit={passwordForm.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          id={newPassId}
          label={t('auth.nouveauMotDePasse')}
          error={errors.errors.motDePasse?.message}
        >
          <div className="relative">
            <Input
              id={newPassId}
              {...passwordForm.register('motDePasse')}
              type={showNew ? 'text' : 'password'}
              placeholder="Minimum 8 caractères"
              autoComplete="new-password"
              autoFocus
              aria-invalid={!!errors.errors.motDePasse}
              className={cn(errorCls(!!errors.errors.motDePasse), 'pr-10')}
            />
            <EyeToggle show={showNew} onToggle={onToggleNew} />
          </div>
        </FormField>

        <AnimatePresence>
          {watchedPassword && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PasswordStrength password={watchedPassword} />
            </motion.div>
          )}
        </AnimatePresence>

        <FormField
          id={confirmId}
          label={t('auth.confirmerMotDePasse')}
          error={errors.errors.confirmation?.message}
        >
          <div className="relative">
            <Input
              id={confirmId}
              {...passwordForm.register('confirmation')}
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={!!errors.errors.confirmation}
              className={cn(errorCls(!!errors.errors.confirmation), 'pr-10')}
            />
            <EyeToggle show={showConfirm} onToggle={onToggleConfirm} />
          </div>
        </FormField>

        <ServerError message={serverError} />

        <div className="flex gap-2.5 pt-1">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onBack}
            disabled={errors.isSubmitting}
          >
            Retour
          </Button>
          <Button type="submit" className="flex-1" disabled={errors.isSubmitting}>
            {errors.isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" />{t('common.loading')}</>
            ) : (
              'Définir mon mot de passe'
            )}
          </Button>
        </div>
      </form>
    </>
  );
}

function errorCls(hasError: boolean) {
  return hasError ? 'border-anac-danger focus:ring-red-300' : '';
}
