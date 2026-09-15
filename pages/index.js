import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    window.location.replace('/EmreTrades_DarkPro.html');
  }, []);

  return null;
}
