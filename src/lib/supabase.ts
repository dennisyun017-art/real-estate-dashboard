import { createClient } from "@supabase/supabase-js";

// 서버 전용 클라이언트 (Service Role Key 사용, API Route/서버 컴포넌트에서만 사용)
// 절대 클라이언트(브라우저)로 노출되면 안 됩니다.
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다."
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
