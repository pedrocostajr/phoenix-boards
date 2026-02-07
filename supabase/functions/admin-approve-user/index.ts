import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
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

        // Verify admin user
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('No authorization header')
        }
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

        if (userError || !user) {
            throw new Error('Invalid token')
        }

        if (user.email !== 'contato@leadsign.com.br') {
            throw new Error('Unauthorized')
        }

        const { userId } = await req.json()
        if (!userId) throw new Error('UserId is required')

        console.log('Approving user:', userId)

        // 1. Update Profile to Approved
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ approved: true })
            .eq('user_id', userId)

        if (profileError) throw profileError

        // 2. Auto-confirm Email in Auth
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { email_confirm: true }
        )

        if (authError) throw authError

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        )
    }
})
