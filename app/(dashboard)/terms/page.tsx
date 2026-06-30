'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-primary">Terms & Conditions</h1>
          <p className="text-muted-foreground text-sm mt-1">Last updated: June 2026</p>
        </div>
        <Link
          href="/"
          className="text-sm font-semibold text-primary bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg hover:bg-primary/20 transition cursor-pointer"
        >
          Back Home
        </Link>
      </div>

      {/* Main Body */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8 space-y-6 text-sm text-foreground/90 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-primary">1. Agreement to Terms</h2>
          <p>
            By accessing or using the OhaBuEnyi Age Grade (OBEAG) application, you agree to be bound by these 
            Terms and Conditions of Use and all applicable laws and regulations. If you do not agree with 
            any of these terms, you are prohibited from using or accessing this application.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-primary">2. Registration & Document Security</h2>
          <p>
            To activate your member profile, you are required to submit private verification documents 
            (including a clear profile picture and birth certificate). 
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>These documents are strictly used to verify age cohort requirements (Jan 1, 1998 to Dec 31, 2002).</li>
            <li>Uploaded documents are securely processed and stored on Supabase Storage.</li>
            <li>Access is restricted solely to verified Age Grade system administrators.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-primary">3. Financial Integrity & Submissions</h2>
          <p>
            Members must perform bank transfers directly to the official Age Grade bank account prior to 
            submitting a payment request in this app. 
          </p>
          <p className="font-semibold text-amber-500 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
            ⚠️ Warning: Submitting fraudulent payment confirmation requests (marking dues as paid without 
            completing bank transfers) will be flagged as insubordination and may result in immediate suspension 
            of app access and disciplinary fines under the Age Grade Constitution.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-primary">4. Cookie & Session Policy</h2>
          <p>
            This application uses essential first-party cookies (specifically related to NextAuth.js session 
            management) to securely maintain your login state. 
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li><strong>Purpose</strong>: To authenticate user sessions, secure dynamic dashboard APIs, and prevent cross-site request forgery.</li>
            <li><strong>Privacy</strong>: No advertising, tracking, or third-party cookies are set or processed.</li>
            <li>By continuing to use this portal, you consent to the storage of these essential session cookies on your device.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-primary">5. Account Termination & App Access</h2>
          <p>
            The executive committee of OhaBuEnyi Age Grade reserves the right, at its sole discretion, 
            to deactivate, suspend, or delete any member account that violates code of conduct policies, 
            remains consistently overdue on payments, or attempts unauthorized access to system features.
          </p>
        </section>

        <section className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground text-center">
          <p>For questions or support regarding these terms, contact ohabuenyiagegrade@gmail.com</p>
        </section>
      </div>
    </div>
  );
}
