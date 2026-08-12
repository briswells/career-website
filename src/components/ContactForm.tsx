'use client'

import Script from 'next/script'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { submitContact, type ContactState } from '@/actions/submit-contact'
import styles from './contact.module.css'

const initialState: ContactState = { status: 'idle' }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button className={styles.submit} type="submit" disabled={pending}>
      {pending ? 'Sending…' : 'Send message'}
    </button>
  )
}

export function ContactForm({ siteKey }: { siteKey?: string }) {
  const [state, formAction] = useActionState(submitContact, initialState)

  if (state.status === 'success') {
    return <p className={styles.success}>Thanks — your message is on its way.</p>
  }

  return (
    <>
      {siteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
        />
      ) : null}
      <form className={styles.form} action={formAction}>
        {state.errors?._form ? <p className={styles.error}>{state.errors._form}</p> : null}

        <div className={styles.field}>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" required maxLength={100} />
          {state.errors?.name ? <span className={styles.error}>{state.errors.name}</span> : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required maxLength={254} />
          {state.errors?.email ? <span className={styles.error}>{state.errors.email}</span> : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="message">Message</label>
          <textarea id="message" name="message" required minLength={10} maxLength={5000} />
          {state.errors?.message ? (
            <span className={styles.error}>{state.errors.message}</span>
          ) : null}
        </div>

        {siteKey ? <div className="cf-turnstile" data-sitekey={siteKey} /> : null}

        <SubmitButton />
      </form>
    </>
  )
}
