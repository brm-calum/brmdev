import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Warehouse, WarehouseFormData } from '../lib/types/warehouse';
import { useAuth } from '../contexts/AuthContext';

export function useWarehouses() {
  const { user, hasRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWarehouse = async (id: string): Promise<Warehouse> => {
    try {
      setIsLoading(true);
      setError(null);

      // Base query
      let query = supabase
        .from('warehouses')
        .select(`
          *,
          type:type_id(*),
          images:warehouse_images(*),
          features:warehouse_feature_assignments(
            feature:warehouse_features(*)
          ),
          services:warehouse_service_assignments(
            service:warehouse_services(*),
            pricing_type,
            price_per_hour_cents,
            price_per_unit_cents,
            unit_type,
            notes
          )
        `)
        .eq('id', id);

      // Add conditions based on authentication
      if (user) {
        query = query.or(`is_active.eq.true,owner_id.eq.${user.id}`);
      } else {
        query = query.eq('is_active', true);
      }

      const { data, error: fetchError } = await query.single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Warehouse not found');

      // Transform the data structure
      const transformedData = {
        ...data,
        features: data.features?.map(f => {
          const feature = f.feature;
          return {
            id: feature.id,
            name: feature.name,
            type: feature.type,
            icon: feature.icon,
            custom_value: f.custom_value
          };
        }) || [],
        services: data.services?.map(s => ({
          id: s.service.id,
          name: s.service.name,
          description: s.service.description,
          icon: s.service.icon,
          pricing_type: s.pricing_type,
          hourly_rate_cents: s.price_per_hour_cents,
          unit_rate_cents: s.price_per_unit_cents,
          unit_type: s.unit_type,
          notes: s.notes
        })) || []
      };

      return transformedData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load warehouse';
      setError(errorMessage);
      console.error('Warehouse fetch error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWarehouse = async (id: string): Promise<void> => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id)
        .eq('owner_id', user?.id);

      if (deleteError) throw deleteError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const duplicateWarehouse = async (id: string): Promise<void> => {
    try {
      setError(null);

      // Fetch the warehouse to duplicate
      const { data: warehouse, error: fetchError } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Create new warehouse with copied data
      const { error: createError } = await supabase
        .from('warehouses')
        .insert({
          ...warehouse,
          id: undefined, // Let the database generate a new ID
          name: `${warehouse.name} (Copy)`,
          owner_id: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (createError) throw createError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const fetchWarehouses = async (): Promise<Warehouse[]> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Add retry logic for network issues
      const maxRetries = 3;
      let retryCount = 0;
      let lastError;

      while (retryCount < maxRetries) {
        try {
          // Build query
          let query = supabase
            .from('warehouses')
            .select(`
              *,
              type:type_id(id, name),
              images:warehouse_images(*)
            `);

          // If user is logged in, also show their inactive warehouses
          if (user) {
            query = query.or(`is_active.eq.true,owner_id.eq.${user.id}`);
          } else {
            query = query.eq('is_active', true);
          }

          // Add ordering
          query = query.order('created_at', { ascending: false });

          const { data, error: fetchError } = await query;

          if (fetchError) throw fetchError;
          return data || [];
        } catch (err) {
          lastError = err;
          retryCount++;
          
          if (retryCount < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            continue;
          }
          throw err;
        }
      }

      throw lastError;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load warehouses';
      setError(errorMessage);
      console.error('Warehouse fetch error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createWarehouse = async (formData: WarehouseFormData): Promise<Warehouse> => {
    if (!hasRole('warehouse_owner')) {
      throw new Error('Only warehouse owners can create listings');
    }

    try {
      setError(null);
      // Extract images, features, and services from form data
      const { images, features, services, ...warehouseData } = formData;
      
      // Insert warehouse
      const { data: warehouse, error: warehouseError } = await supabase
        .from('warehouses')
        .insert({
          ...warehouseData,
          owner_id: user?.id
        })
        .select()
        .single();

      if (warehouseError) throw warehouseError;

      // Insert feature assignments
      if (features?.length) {
        const { error: featuresError } = await supabase
          .from('warehouse_feature_assignments')
          .insert(
            features.map(f => ({
              warehouse_id: warehouse.id,
              feature_id: f.id,
              custom_value: f.custom_value
            }))
          );

        if (featuresError) throw featuresError;
      }

      // Insert service assignments
      if (services?.length) {
        const { error: servicesError } = await supabase
          .from('warehouse_service_assignments')
          .insert(services.map(s => {
            const serviceData: any = {
              warehouse_id: warehouse.id,
              service_id: s.id,
              notes: s.notes
            };

            // Set pricing type and related fields
            if (s.price_per_hour_cents) {
              serviceData.pricing_type = 'hourly_rate';
              serviceData.price_per_hour_cents = s.price_per_hour_cents;
            } else if (s.price_per_unit_cents && s.unit_type) {
              serviceData.pricing_type = 'per_unit';
              serviceData.price_per_unit_cents = s.price_per_unit_cents;
              serviceData.unit_type = s.unit_type;
            } else {
              serviceData.pricing_type = 'ask_quote';
            }

            return serviceData;
          }));

        if (servicesError) throw servicesError;
      }

      // Insert images
      if (images?.length) {
        const { error: imagesError } = await supabase
          .from('warehouse_images')
          .insert(
            images.map(img => ({
              warehouse_id: warehouse.id,
              url: img.url,
              order: img.order,
            }))
          );

        if (imagesError) throw imagesError;
      }

      return warehouse;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const updateWarehouse = async (id: string, formData: Partial<WarehouseFormData>): Promise<void> => {
    try {
      setError(null);
      const { images, features, services, ...warehouseData } = formData;

      const { error: updateError } = await supabase
        .from('warehouses')
        .update({
          ...warehouseData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('owner_id', user?.id);

      if (updateError) throw updateError;

      // Update features
      if (features) {
        // Delete existing features
        await supabase
          .from('warehouse_feature_assignments')
          .delete()
          .eq('warehouse_id', id);

        // Insert new features
        if (features.length > 0) {
          const { error: featuresError } = await supabase
            .from('warehouse_feature_assignments')
            .insert(
              features.map(f => ({
                warehouse_id: id,
                feature_id: f.id,
                custom_value: f.custom_value
              }))
            );

          if (featuresError) throw featuresError;
        }
      }

      // Update services
      if (services) {
        // Delete existing services
        await supabase
          .from('warehouse_service_assignments')
          .delete()
          .eq('warehouse_id', id);

        // Insert new services
        if (services.length > 0) {
          const { error: servicesError } = await supabase
            .from('warehouse_service_assignments')
            .insert(services.map(s => {
              const serviceData: any = {
                warehouse_id: id,
                service_id: s.id,
                notes: s.notes
              };

              // Set pricing type and related fields
              if (s.price_per_hour_cents) {
                serviceData.pricing_type = 'hourly_rate';
                serviceData.price_per_hour_cents = s.price_per_hour_cents;
              } else if (s.price_per_unit_cents && s.unit_type) {
                serviceData.pricing_type = 'per_unit';
                serviceData.price_per_unit_cents = s.price_per_unit_cents;
                serviceData.unit_type = s.unit_type;
              } else {
                serviceData.pricing_type = 'ask_quote';
              }

              return serviceData;
            }));

          if (servicesError) throw servicesError;
        }
      }

      if (images?.length) {
        // First delete existing images
        const { error: deleteError } = await supabase
          .from('warehouse_images')
          .delete()
          .eq('warehouse_id', id);

        if (deleteError) throw deleteError;

        // Then insert new images
        const { error: imagesError } = await supabase
          .from('warehouse_images')
          .insert(
            images.map(img => ({
              warehouse_id: id,
              url: img.url,
              order: img.order,
            }))
          );

        if (imagesError) throw imagesError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const deleteWarehouseImage = async (imageId: string, warehouseId: string): Promise<void> => {
    try {
      setError(null);
      
      // Verify ownership before deletion
      const { data: warehouse, error: verifyError } = await supabase
        .from('warehouses')
        .select('id')
        .eq('id', warehouseId)
        .eq('owner_id', user?.id)
        .single();

      if (verifyError || !warehouse) {
        throw new Error('Unauthorized to delete this image');
      }

      const { error: deleteError } = await supabase
        .from('warehouse_images')
        .delete()
        .eq('id', imageId)
        .eq('warehouse_id', warehouseId);

      if (deleteError) throw deleteError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const toggleWarehouseStatus = async (id: string, isActive: boolean): Promise<void> => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('warehouses')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('owner_id', user?.id);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  return {
    fetchWarehouses,
    fetchWarehouse,
    createWarehouse,
    updateWarehouse,
    toggleWarehouseStatus,
    deleteWarehouse,
    deleteWarehouseImage,
    duplicateWarehouse,
    isLoading,
    error,
  };
}