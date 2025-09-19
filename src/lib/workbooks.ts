import { supabase, Database } from './supabase'

export type Workbook = Database['public']['Tables']['workbooks']['Row']
export type WorkbookInsert = Database['public']['Tables']['workbooks']['Insert']
export type WorkbookUpdate = Database['public']['Tables']['workbooks']['Update']
export type WorkbookItem = Database['public']['Tables']['workbook_items']['Row']

export interface WorkbookWithDetails extends Workbook {
  item_count?: number
  profiles?: {
    name: string
  }
}

export interface WorkbookFilters {
  subject?: string
  type?: string
  week?: string
  search?: string
}

export const workbookApi = {
  // 문제집 목록 조회 (필터링 및 검색 포함)
  async getWorkbooks(filters: WorkbookFilters = {}) {
    let query = supabase
      .from('workbooks')
      .select(`
        *,
        profiles!workbooks_created_by_fkey(name)
      `)
      .order('created_at', { ascending: false })

    // 필터 적용
    if (filters.subject && filters.subject !== '전체 과목') {
      const subjectMap: { [key: string]: string } = {
        '연출': 'directing',
        '작법': 'writing', 
        '연구': 'research',
        '통합': 'integrated'
      }
      query = query.eq('subject', subjectMap[filters.subject] || filters.subject)
    }

    if (filters.type && filters.type !== '전체 유형') {
      const typeMap: { [key: string]: string } = {
        'SRS형': 'SRS',
        'PDF 제출형': 'PDF',
        '서술형': 'ESSAY',
        '영화감상형': 'VIEWING',
        '인터넷강의시청형': 'LECTURE'
      }
      query = query.eq('type', typeMap[filters.type] || filters.type)
    }

    if (filters.week && filters.week !== '전체 주차') {
      if (filters.week === '공통') {
        query = query.eq('is_common', true)
      } else {
        const weekNum = parseInt(filters.week.replace('주차', ''))
        if (!isNaN(weekNum)) {
          query = query.eq('week', weekNum)
        }
      }
    }

    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching workbooks:', error)
      throw error
    }

    // 각 워크북에 대해 문항 수를 별도로 조회
    const workbooksWithCounts = await Promise.all(
      (data || []).map(async (workbook) => {
        const { count } = await supabase
          .from('workbook_items')
          .select('*', { count: 'exact', head: true })
          .eq('workbook_id', workbook.id)
        
        return {
          ...workbook,
          item_count: count || 0
        }
      })
    )

    return workbooksWithCounts as WorkbookWithDetails[]
  },

  // 특정 문제집 조회
  async getWorkbook(id: number) {
    const { data, error } = await supabase
      .from('workbooks')
      .select(`
        *,
        profiles!workbooks_created_by_fkey(name),
        workbook_items(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching workbook:', error)
      throw error
    }

    return data
  },

  // 문제집 생성
  async createWorkbook(workbook: WorkbookInsert) {
    const { data, error } = await supabase
      .from('workbooks')
      .insert(workbook)
      .select()
      .single()

    if (error) {
      console.error('Error creating workbook:', error)
      throw error
    }

    return data
  },

  // 문제집 수정
  async updateWorkbook(id: number, updates: WorkbookUpdate) {
    const { data, error } = await supabase
      .from('workbooks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating workbook:', error)
      throw error
    }

    return data
  },

  // 문제집 삭제
  async deleteWorkbook(id: number) {
    const { error } = await supabase
      .from('workbooks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting workbook:', error)
      throw error
    }
  }
}

// 과목 라벨 매핑
export const subjectLabels: { [key: string]: string } = {
  'directing': '연출',
  'writing': '작법',
  'research': '연구', 
  'integrated': '통합'
}

// 유형 라벨 매핑
export const typeLabels: { [key: string]: string } = {
  'SRS': 'SRS형',
  'PDF': 'PDF 제출형',
  'ESSAY': '서술형',
  'VIEWING': '영화감상형',
  'LECTURE': '인터넷강의시청형'
}

// 유형별 색상 매핑
export const typeColors: { [key: string]: string } = {
  'SRS': 'bg-purple-100 text-purple-800',
  'PDF': 'bg-orange-100 text-orange-800',
  'ESSAY': 'bg-teal-100 text-teal-800',
  'VIEWING': 'bg-pink-100 text-pink-800',
  'LECTURE': 'bg-yellow-100 text-yellow-800'
}

// 과목별 색상 매핑
export const subjectColors: { [key: string]: string } = {
  'directing': 'bg-blue-100 text-blue-800',
  'writing': 'bg-green-100 text-green-800',
  'research': 'bg-red-100 text-red-800',
  'integrated': 'bg-purple-100 text-purple-800'
}