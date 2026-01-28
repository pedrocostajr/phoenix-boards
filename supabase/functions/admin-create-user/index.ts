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
    console.log('🚀 Admin create user function started')
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
    console.log('🔍 Environment check:', {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    })

    // Verificar se o usuário atual é admin
    const authHeader = req.headers.get('Authorization')
    console.log('🔍 Auth header exists:', !!authHeader)
    console.log('🔍 All headers:', Object.fromEntries(req.headers.entries()))
    
    if (!authHeader) {
      console.error('❌ No authorization header provided')
      throw new Error('Token de autorização não fornecido')
    }
    
    console.log('🔍 Authorization header found')
    
    const token = authHeader.replace('Bearer ', '')
    console.log('🔍 Token length:', token.length)
    
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData.user) {
      console.error('❌ User verification failed:', userError)
      console.error('❌ User data:', userData)
      throw new Error('Token de autorização inválido')
    }

    console.log('👤 User verified:', userData.user.email)

    // Verificar se o email é o admin autorizado
    if (userData.user.email !== 'contato@leadsign.com.br') {
      console.error('❌ Insufficient permissions for email:', userData.user.email)
      throw new Error(`Permissões insuficientes. Email atual: ${userData.user.email}`)
    }

    console.log('✅ Admin permissions verified')

    // Get request body - Supabase client sends object directly
    let requestBody;
    let full_name, email, role;
    
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
      
      // Extract fields
      full_name = requestBody.full_name;
      email = requestBody.email;
      role = requestBody.role;
      
      console.log('📝 Extracted data:', { full_name, email, role });
      
    } catch (error) {
      console.error('❌ Error processing request body:', error);
      throw new Error(`Request body processing failed: ${error.message}`);
    }

    // Validate required fields
    if (!full_name || !email || !role) {
      const missing = [];
      if (!full_name) missing.push('full_name');
      if (!email) missing.push('email');
      if (!role) missing.push('role');
      console.error('❌ Missing required fields:', missing);
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Verificar se usuário já existe
    console.log('🔍 Checking if user already exists...')
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUser.users.find(u => u.email === email)
    
    if (userExists) {
      console.log('👤 User already exists, checking profile...')
      
      // Verificar se perfil já existe
      const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', userExists.id)
        .maybeSingle()
      
      console.log('🔍 Profile check result:', { existingProfile, profileCheckError })
      
      if (existingProfile) {
        console.log('✅ User and profile already exist')
        return new Response(
          JSON.stringify({ success: true, user: userExists, message: 'Usuário já existe' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      } else {
        // Usuário existe mas não tem perfil - criar perfil usando upsert
        console.log('🔄 Creating profile for existing user...')
        
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            user_id: userExists.id,
            full_name: full_name,
            role: role,
            approved: true, // Usuários criados pelo admin são automaticamente aprovados
          }, {
            onConflict: 'user_id'
          })

        if (profileError) {
          console.error('❌ Profile creation failed:', profileError)
          throw profileError
        }

        console.log('✅ Profile created for existing user')
        return new Response(
          JSON.stringify({ success: true, user: userExists, message: 'Perfil criado para usuário existente' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    // Criar novo usuário
    console.log('🔄 Creating new user in auth...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: 'temp123456', // Senha temporária
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
      }
    })

    if (authError) {
      console.error('❌ Auth user creation failed:', authError)
      throw authError
    }

    console.log('✅ Auth user created:', authData.user.id)

    // Criar perfil
    console.log('🔄 Creating user profile...')
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        full_name: full_name,
        role: role,
        approved: true, // Usuários criados pelo admin são automaticamente aprovados
      })

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError)
      throw profileError
    }

    console.log('✅ Profile created successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: authData.user,
        message: `Usuário ${full_name} criado e aprovado com sucesso!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('❌ Function error:', error)
    console.error('❌ Error type:', typeof error)
    console.error('❌ Error constructor:', error.constructor.name)
    console.error('❌ Stack trace:', error.stack)
    
    // Retornar mais detalhes do erro
    const errorMessage = error.message || 'Erro interno do servidor'
    const errorDetails = error.code ? `Código: ${error.code}` : ''
    
    // Determinar status code baseado no tipo de erro
    let statusCode = 500;
    if (errorMessage.includes('autorização') || errorMessage.includes('Permissões')) {
      statusCode = 401;
    } else if (errorMessage.includes('required fields')) {
      statusCode = 400;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
        success: false,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: statusCode },
    )
  }
})