import React from 'react';
import { BookOpen, Check, Copy, ExternalLink, Key, ShieldCheck, X } from 'lucide-react';

interface BeginnerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  appOrigin: string;
}

export const BeginnerGuideModal: React.FC<BeginnerGuideModalProps> = ({
  isOpen,
  onClose,
  appOrigin,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const copyOrigin = () => {
    navigator.clipboard.writeText(appOrigin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      num: 1,
      title: 'Create a Google Cloud Project',
      desc: 'Go to Google Cloud Console (console.cloud.google.com). In the top project dropdown, click "New Project", give it a name like "Meeting Scanner App", and click "Create".',
      link: 'https://console.cloud.google.com/projectcreate',
      linkText: 'Open Project Creator',
    },
    {
      num: 2,
      title: 'Enable Gmail & Calendar APIs',
      desc: 'Open "APIs & Services" > "Library". Search for and enable both "Gmail API" and "Google Calendar API".',
      link: 'https://console.cloud.google.com/apis/library',
      linkText: 'Open API Library',
    },
    {
      num: 3,
      title: 'Configure OAuth Consent Screen',
      desc: 'In "APIs & Services" > "OAuth consent screen", choose "External" and click Create. Fill in the App name ("Meeting Scanner") and your user support email. In the "Test users" step, make sure to add your own Gmail address so you can sign in during Testing mode.',
      link: 'https://console.cloud.google.com/apis/credentials/consent',
      linkText: 'Configure Consent Screen',
    },
    {
      num: 4,
      title: 'Create OAuth Client ID',
      desc: 'In "APIs & Services" > "Credentials", click "+ Create Credentials" > "OAuth client ID". Choose "Web application" as the Application Type.',
      link: 'https://console.cloud.google.com/apis/credentials',
      linkText: 'Create Credentials',
    },
    {
      num: 5,
      title: 'Add Authorized JavaScript Origin',
      desc: 'Under "Authorized JavaScript origins", click "+ Add URI" and paste the exact URL where this app is running:',
      hasOriginCopy: true,
    },
    {
      num: 6,
      title: 'Paste Client ID into Settings',
      desc: 'Copy the generated Client ID (looks like xxxxxxxxx.apps.googleusercontent.com), return to this app, open Settings, paste it in the "Google OAuth Client ID" field, and click "Save Settings".',
      hasFinishBadge: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Google Cloud Setup Guide</h2>
              <p className="text-xs text-slate-400">Step-by-step instructions for beginners</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-300 divide-y divide-slate-800/60">
          {steps.map((step) => (
            <div key={step.num} className="pt-4 first:pt-0 flex gap-4 items-start">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                {step.num}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-100">{step.title}</h3>
                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-medium"
                    >
                      {step.linkText} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{step.desc}</p>

                {step.hasOriginCopy && (
                  <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
                    <span className="flex-1 text-indigo-300 truncate select-all">{appOrigin}</span>
                    <button
                      onClick={copyOrigin}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-sans transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy URI
                        </>
                      )}
                    </button>
                  </div>
                )}

                {step.hasFinishBadge && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <ShieldCheck className="w-4 h-4" /> That's it! Your app will immediately scan and sync.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Key className="w-4 h-4 text-amber-400" />
            <span>Only readonly Gmail and Calendar scopes are requested.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
          >
            Got it, close
          </button>
        </div>
      </div>
    </div>
  );
};
