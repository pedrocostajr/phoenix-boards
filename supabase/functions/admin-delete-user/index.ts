import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Admin delete user function started')
    console.log('📋 Request method:', req.method)
    console.log('📋 Request headers:', Object.fromEntries(req.headers.entries()))
    console.log('📋 Request URL:', req.url)
    
    // Check if request has body
    const hasBody = req.headers.get('content-length') !== '0' && req.headers.get('content-length') !== null;
    console.log('📋 Has body:', hasBody, 'Content-Length:', req.headers.get('content-length'))
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('✅ Supabase admin client created')

    // Verificar se o usuário atual é admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header provided')
    }
    
    console.log('🔍 Authorization header found')
    
    const token = authHeader.replace('Bearer ', '')
    
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData.user) {
      console.error('❌ User verification failed:', userError)
      throw new Error('Unauthorized')
    }

    console.log('👤 User verified:', userData.user.email)

    // Verificar se o email é o admin autorizado
    if (userData.user.email !== 'contato@leadsign.com.br') {
      console.error('❌ Insufficient permissions for email:', userData.user.email)
      throw new Error('Insufficient permissions')
    }

    console.log('✅ Admin permissions verified')

    // Get request body - Supabase client sends object directly
    let requestBody;
    let userId;
    
    try {
      // Try to get JSON directly first (Supabase client method)
      try {
        requestBody = await req.json();
        console.log('✅ JSON parsed directly:', requestBody);
      } catch (jsonError) {
        console.log('⚠️ Direct JSON failed, trying text method:', jsonError.message);
        
        // Fallback to text method
        const rawText = await req.text();
        console.log('📄 Raw request body text:', rawText);
        
        if (!rawText || rawText.trim() === '') {
          throw new Error('Request body is empty or missing');
        }
        
        requestBody = JSON.parse(rawText);
        console.log('✅ JSON parsed from text:', requestBody);
      }
      
      // Extract fields - using the field name we're sending from frontend
      userId = requestBody.userId;
      console.log('📝 Extracted data - userId:', userId);
      
    } catch (error) {
      console.error('❌ Error processing request body:', error);
      throw new Error(`Request body processing failed: ${error.message}`);
    }

    // Validate required fields
    if (!userId) {
      console.error('❌ Missing required field: userId');
      throw new Error('Missing required field: userId is required');
    }

    // Primeiro remover o perfil
    console.log('🔄 Deleting user profile...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId)

    if (profileError) {
      console.error('❌ Profile deletion failed:', profileError)
      throw profileError
    }

    console.log('✅ Profile deleted successfully')

    // Depois remover o usuário da auth
    console.log('🔄 Deleting user from auth...')
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('❌ Auth user deletion failed:', authError)
      throw authError
    }

    console.log('✅ Auth user deleted successfully')

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('❌ Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})