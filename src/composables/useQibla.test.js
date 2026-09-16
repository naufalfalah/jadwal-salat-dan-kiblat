import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useQibla } from './useQibla.js'

// Koordinat Kaaba, sama dengan konstanta MECCA di useQibla.js
const MECCA = { lat: 21.4225, lng: 39.8262 }

describe('useQibla — qiblaAngle', () => {
  it('menunjuk ke utara (0°) saat posisi tepat di selatan Mekkah (longitude sama)', () => {
    const { qiblaAngle } = useQibla(MECCA.lat - 20, MECCA.lng)
    expect(qiblaAngle.value).toBeCloseTo(0, 6)
  })

  it('menunjuk ke selatan (180°) saat posisi tepat di utara Mekkah (longitude sama)', () => {
    const { qiblaAngle } = useQibla(MECCA.lat + 20, MECCA.lng)
    expect(qiblaAngle.value).toBeCloseTo(180, 6)
  })

  it('menghasilkan sudut dalam rentang [0, 360) untuk lokasi sembarang', () => {
    // Jakarta
    const { qiblaAngle } = useQibla(-6.2088, 106.8456)
    expect(qiblaAngle.value).toBeGreaterThanOrEqual(0)
    expect(qiblaAngle.value).toBeLessThan(360)
  })

  it('reaktif terhadap perubahan koordinat input (ref)', () => {
    const lat = ref(MECCA.lat - 20)
    const lng = ref(MECCA.lng)
    const { qiblaAngle } = useQibla(lat, lng)
    expect(qiblaAngle.value).toBeCloseTo(0, 6)

    lat.value = MECCA.lat + 20
    expect(qiblaAngle.value).toBeCloseTo(180, 6)
  })

  it('mengembalikan null saat lat/lng belum tersedia', () => {
    const { qiblaAngle } = useQibla(null, null)
    expect(qiblaAngle.value).toBeNull()
  })
})
