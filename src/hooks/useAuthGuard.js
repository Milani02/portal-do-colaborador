import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { cargoToRoute } from '../utils/constants';

export function useAuthGuard(requiredCargo = null) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        // getSession lê do localStorage — zero chamada de rede
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (!session?.user) { navigate('/'); return; }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!isMounted) return;
        if (error || !data) { navigate('/'); return; }

        if (requiredCargo && data.cargo !== requiredCargo) {
          navigate(cargoToRoute[data.cargo] || '/');
          return;
        }

        setPerfil(data);
      } catch {
        if (isMounted) navigate('/');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();
    return () => { isMounted = false; };
  }, [navigate, requiredCargo]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return { perfil, loading, logout };
}
