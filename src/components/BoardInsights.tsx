import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend
} from 'recharts';
import { 
  ListTodo, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  User, 
  Tag as TagIcon,
  Activity,
  CheckSquare
} from 'lucide-react';

interface Column {
  id: string;
  name: string;
  color: string;
  position: number;
  board_id: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  project_id: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  position: number;
  priority: string;
  due_date: string | null;
  completed: boolean;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

interface Profile {
  user_id: string;
  approved: boolean;
  full_name?: string;
  email?: string;
  avatar_url?: string | null;
}

interface ChecklistItem {
  id: string;
  task_id: string;
  text: string;
  completed: boolean;
  position: number;
}

interface BoardInsightsProps {
  tasks: Task[];
  columns: Column[];
  checklistItems: ChecklistItem[];
  projectMembers: Profile[];
  projectTags: Tag[];
}

export const BoardInsights = ({
  tasks,
  columns,
  checklistItems,
  projectMembers,
  projectTags
}: BoardInsightsProps) => {

  // Helper to check if a column represents a completed state
  const isCompletedColumn = (columnName: string, columnPosition: number, allCols: Column[]) => {
    const name = columnName.toLowerCase();
    const isNameMatch = name.includes('concluid') || name.includes('finaliz') || name.includes('pront') || name.includes('done') || name.includes('entreg');
    if (isNameMatch) return true;
    
    // Fallback: is it the column with the highest position?
    if (allCols.length > 1) {
      const maxPosition = Math.max(...allCols.map(c => c.position));
      return columnPosition === maxPosition;
    }
    return false;
  };

  // Helper to determine if a task is completed
  const isTaskCompleted = (task: Task) => {
    if (task.completed) return true;
    const col = columns.find(c => c.id === task.column_id);
    return col ? isCompletedColumn(col.name, col.position, columns) : false;
  };

  const totalTasks = tasks.length;
  
  // Completed task stats
  const completedTasksCount = tasks.filter(isTaskCompleted).length;
  const completedPercentage = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  // Dynamic column calculations
  const columnData = columns
    .sort((a, b) => a.position - b.position)
    .map(col => {
      const colTasks = tasks.filter(t => t.column_id === col.id);
      const percentage = totalTasks > 0 ? Math.round((colTasks.length / totalTasks) * 100) : 0;
      return {
        id: col.id,
        name: col.name,
        value: colTasks.length,
        percentage,
        color: col.color || '#6366f1'
      };
    });

  // Checklist stats
  const boardTaskIds = tasks.map(t => t.id);
  const boardChecklistItems = checklistItems.filter(item => boardTaskIds.includes(item.task_id));
  const completedChecklistCount = boardChecklistItems.filter(item => item.completed).length;
  const checklistCompletionRate = boardChecklistItems.length > 0 
    ? Math.round((completedChecklistCount / boardChecklistItems.length) * 100)
    : 0;

  // Overdue and Due Soon Tasks
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = tasks.filter(t => {
    if (isTaskCompleted(t) || !t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate < today;
  });

  const dueSoonTasks = tasks.filter(t => {
    if (isTaskCompleted(t) || !t.due_date) return false;
    const dueDate = new Date(t.due_date);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  });

  // Recharts: Column distribution data (uses actual columns)
  const statusData = columnData.filter(d => d.value > 0);

  // Recharts: Priority data
  const priorityCounts = tasks.reduce((acc: any, task) => {
    const p = task.priority || 'medium';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, { low: 0, medium: 0, high: 0, urgent: 0 });

  const priorityData = [
    { name: 'Baixa', Quantidade: priorityCounts.low, color: '#3b82f6' },
    { name: 'Média', Quantidade: priorityCounts.medium, color: '#6366f1' },
    { name: 'Alta', Quantidade: priorityCounts.high, color: '#f59e0b' },
    { name: 'Urgente', Quantidade: priorityCounts.urgent, color: '#ef4444' }
  ];

  // Recharts: Member Workload by Column
  const memberWorkload = projectMembers.map(member => {
    const memberTasks = tasks.filter(t => t.assigned_to === member.user_id);
    const workloadItem: any = {
      name: member.full_name?.split(' ')[0] || member.email?.split('@')[0] || 'Membro',
      total: memberTasks.length
    };
    
    columns.forEach(col => {
      workloadItem[col.name] = memberTasks.filter(t => t.column_id === col.id).length;
    });
    
    return workloadItem;
  }).filter(m => m.total > 0);

  // Unassigned tasks workload by Column
  const unassignedTasks = tasks.filter(t => !t.assigned_to);
  if (unassignedTasks.length > 0) {
    const unassignedItem: any = {
      name: 'Sem Atribuição',
      total: unassignedTasks.length
    };
    columns.forEach(col => {
      unassignedItem[col.name] = unassignedTasks.filter(t => t.column_id === col.id).length;
    });
    memberWorkload.push(unassignedItem);
  }

  // Tags usage counts
  const tagCounts = tasks.reduce((acc: any, task) => {
    if (task.tags) {
      task.tags.forEach(tag => {
        acc[tag.id] = acc[tag.id] || { name: tag.name, color: tag.color, count: 0 };
        acc[tag.id].count += 1;
      });
    }
    return acc;
  }, {});

  const tagData = Object.values(tagCounts)
    .map((t: any) => ({ name: t.name, Quantidade: t.count, color: t.color }))
    .sort((a, b) => b.Quantidade - a.Quantidade)
    .slice(0, 5); // top 5 tags

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'border-blue-500/20 text-blue-400 bg-blue-500/10';
      case 'medium': return 'border-indigo-500/20 text-indigo-400 bg-indigo-500/10';
      case 'high': return 'border-amber-500/20 text-amber-400 bg-amber-500/10';
      case 'urgent': return 'border-red-500/20 text-red-400 bg-red-500/10';
      default: return 'border-slate-500/20 text-slate-400 bg-slate-500/10';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return 'Baixa';
      case 'medium': return 'Média';
      case 'high': return 'Alta';
      case 'urgent': return 'Urgente';
      default: return 'Normal';
    }
  };

  if (totalTasks === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 animate-pulse">
          <Activity className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Sem dados para análise</h3>
        <p className="text-muted-foreground max-w-sm text-sm">
          Adicione cartões com tarefas e prazos ao quadro para começar a visualizar as estatísticas de andamento e insights de produtividade.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-1 pt-0 pb-16">
      
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        
        {/* Total Tasks Card */}
        <Card className="bg-[#1a1d23]/40 border-white/5 backdrop-blur-xl hover:border-white/10 transition-all duration-300 shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <ListTodo className="h-14 w-14 text-white" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Total de Demandas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Cartões no quadro</p>
          </CardContent>
        </Card>

        {/* Dynamic Column Cards */}
        {columnData.map(col => (
          <Card key={col.id} className="bg-[#1a1d23]/40 border-white/5 backdrop-blur-xl hover:border-white/10 transition-all duration-300 shadow-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
              <Clock className="h-14 w-14" style={{ color: col.color }} />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-bold tracking-wider text-muted-foreground truncate" title={col.name}>
                {col.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black" style={{ color: col.color }}>{col.value}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="relative w-full h-1.5 rounded-full overflow-hidden bg-white/5 flex-1">
                  <div 
                    className="h-full rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${col.percentage}%`, 
                      backgroundColor: col.color 
                    }} 
                  />
                </div>
                <span className="text-[10px] font-bold" style={{ color: col.color }}>{col.percentage}%</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Checklist Completion Card */}
        <Card className="bg-[#1a1d23]/40 border-white/5 backdrop-blur-xl hover:border-white/10 transition-all duration-300 shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <CheckSquare className="h-14 w-14 text-indigo-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Progresso de Checklist</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-indigo-500">{checklistCompletionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {completedChecklistCount} de {boardChecklistItems.length} itens resolvidos
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Main Charts & Deadlines Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Status Distribution (Pie Chart) */}
        <Card className="bg-[#1a1d23]/40 border-white/5 backdrop-blur-xl lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Status das Demandas
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Proporção de tarefas em cada estágio do fluxo de trabalho
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
            {statusData.length > 0 ? (
              <>
                <div className="w-full h-52 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1d23', 
                          borderColor: 'rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center percentage indicator */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-white">{completedPercentage}%</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Concluído</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="w-full flex flex-wrap justify-center gap-2 mt-4 text-xs font-semibold">
                  {statusData.map((entry, index) => (
                    <div key={index} className="flex flex-col items-center p-2 px-3 rounded-xl bg-white/[0.02] border border-white/5 min-w-[100px]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider truncate max-w-[80px]" title={entry.name}>{entry.name}</span>
                      </div>
                      <span className="text-white font-extrabold text-sm">{entry.value} <span className="text-muted-foreground text-xs font-normal">({entry.percentage}%)</span></span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground text-sm">Nenhuma tarefa categorizada ainda.</div>
            )}
          </CardContent>
        </Card>

        {/* Priority Breakdown (Bar Chart) */}
        <Card className="bg-[#1a1d23]/40 border-white/5 backdrop-blur-xl lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Nível de Prioridade
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Distribuição de urgência das demandas cadastradas no quadro
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={11} 
                  fontWeight="bold" 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  fontWeight="bold" 
                  tickLine={false} 
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ 
                    backgroundColor: '#1a1d23', 
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="Quantidade" radius={[6, 6, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* Member Workload & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Workload by Member (Stacked Bar Chart) */}
        <Card className="bg-[#1a1d23]/40 border-white/5 backdrop-blur-xl lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Distribuição de Trabalho por Responsável
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Volume de demandas atribuídas e andamento por membro do time
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 mt-2">
            {memberWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberWorkload} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={11} 
                    fontWeight="bold" 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={11} 
                    fontWeight="bold" 
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ 
                      backgroundColor: '#1a1d23', 
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend 
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', fontWeight: '600', paddingTop: '10px' }}
                  />
                  {columns.map((col, idx) => (
                    <Bar 
                      key={col.id} 
                      dataKey={col.name} 
                      stackId="a" 
                      fill={col.color || '#6366f1'} 
                      radius={idx === columns.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} 
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Nenhum membro com tarefas atribuídas neste quadro.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Tags & Deadlines Summary */}
        <Card className="bg-[#1a1d23]/40 border-white/5 backdrop-blur-xl lg:col-span-1 shadow-lg flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-primary" />
              Etiquetas Mais Utilizadas
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Principais categorias de demandas aplicadas neste quadro
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            {tagData.length > 0 ? (
              <div className="space-y-4">
                {tagData.map((tag, index) => (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold" style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}40` }}>
                        {tag.name}
                      </span>
                      <span className="text-white font-mono">{tag.Quantidade} {tag.Quantidade === 1 ? 'tarefa' : 'tarefas'}</span>
                    </div>
                    <Progress value={(tag.Quantidade / totalTasks) * 100} className="h-1.5 bg-white/5 [&>div]:bg-primary" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma etiqueta aplicada às tarefas deste quadro ainda.
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Deadlines & Overdue Tasks Alert Section */}
      <Card className="bg-[#1a1d23]/40 border-white/5 backdrop-blur-xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Controle de Prazos e Pendências Urgentes
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Acompanhamento de tarefas atrasadas ou próximas do prazo final
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Overdue Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <h4 className="text-xs uppercase tracking-widest font-black text-red-500">Atrasadas ({overdueTasks.length})</h4>
              </div>
              
              {overdueTasks.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {overdueTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all duration-200">
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-xs font-bold text-white truncate">{task.title}</p>
                        <p className="text-[10px] text-red-400 font-bold mt-0.5">
                          Prazo: {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Sem data'}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-black uppercase ${getPriorityBadgeColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center bg-white/[0.01] rounded-xl border border-dashed border-white/5">
                  Parabéns! Nenhuma tarefa pendente está atrasada.
                </p>
              )}
            </div>

            {/* Due Soon Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <h4 className="text-xs uppercase tracking-widest font-black text-amber-500">Próximos 3 Dias ({dueSoonTasks.length})</h4>
              </div>

              {dueSoonTasks.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {dueSoonTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-all duration-200">
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-xs font-bold text-white truncate">{task.title}</p>
                        <p className="text-[10px] text-amber-400 font-bold mt-0.5">
                          Vence em: {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Sem data'}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-black uppercase ${getPriorityBadgeColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center bg-white/[0.01] rounded-xl border border-dashed border-white/5">
                  Tudo sob controle. Nenhuma tarefa vencendo nos próximos dias.
                </p>
              )}
            </div>

          </div>
        </CardContent>
      </Card>
      
    </div>
  );
};
