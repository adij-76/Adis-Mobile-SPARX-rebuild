import { LegalScreen } from '@/components/legal-screen';

export default function PrivacyPolicy() {
  return (
    <LegalScreen
      title="Privacy Policy"
      updated="July 2024"
      sections={[
        {
          heading: 'Overview',
          body: 'IGNTD is built on trust. This policy explains what information we collect, how we use it, and the choices you have. We only collect what we need to give you a helpful, personalised experience.',
        },
        {
          heading: 'What we collect',
          body: 'Account details you provide, your daily check-ins and assessment responses, and basic usage data that helps us improve the app. Your check-ins and reports are private to your account.',
        },
        {
          heading: 'How we use it',
          body: 'To personalise your reports and recommendations, to support your progress, and to keep the app secure. We never sell your personal data.',
        },
        {
          heading: 'Your choices',
          body: 'You can edit or delete your data at any time from your profile. Deleting your account permanently removes your information from our systems.',
        },
        {
          heading: 'Contact',
          body: 'Questions about privacy? Reach us any time at privacy@igntd.com.',
        },
      ]}
    />
  );
}
