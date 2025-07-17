// src/pages/AccountArchivedPage.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';   // ← import the hook

export default function AccountArchivedPage() {
  const { t } = useTranslation();                 // ← get the translator
  return (
    <div style={{ maxWidth: 600, margin: '4rem auto', textAlign: 'center' }}>
      <h1>{t('accountArchivedPage.title')}</h1>
      <p>{t('accountArchivedPage.message')}</p>
    </div>
  );
}
