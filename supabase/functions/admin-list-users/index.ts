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

        if (user.email !== 'contato@leadsign.com.br') { // Hardcoded admin check matching existing logic
            throw new Error('Unauthorized')
        }

        // Fetch all users from auth.users
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

        if (listError) throw listError

        // Fetch all profiles to merge data
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('*')

        if (profilesError) throw profilesError

        // Merge data
        const mergedUsers = users.map(u => {
            const profile = profiles.find(p => p.user_id === u.id)
            return {
                id: u.id,
                email: u.email,
                email_confirmed_at: u.email_confirmed_at,
                last_sign_in_at: u.last_sign_in_at,
                created_at: u.created_at,
                user_metadata: u.user_metadata,
                profile: profile || null
            }
        })

        return new Response(
            JSON.stringify({ users: mergedUsers }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        )
    }
})
